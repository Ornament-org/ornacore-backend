import { createWriteStream } from "node:fs";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { setImmediate } from "node:timers";
import { createGzip } from "node:zlib";
import { spawn } from "node:child_process";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { nodemailerProvider } from "../../integrations/mail/nodemailer.provider.js";
import { AppError } from "../../shared/errors/AppError.js";

const backupFilePrefix = "ornacore-db-backup";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const timestampForFile = () => new Date().toISOString().replace(/[:.]/g, "-");

const resolveBackupDir = () => path.resolve(process.cwd(), env.DB_BACKUP_DIR);

const createBackupFilePath = () =>
  path.join(resolveBackupDir(), `${backupFilePrefix}-${env.DB_NAME}-${timestampForFile()}.sql.gz`);

const cancelledBackupError = () =>
  new AppError("Database backup was cancelled", {
    statusCode: 499,
    code: "DATABASE_BACKUP_CANCELLED",
  });

const throwIfCancelled = (signal) => {
  if (signal?.aborted) throw cancelledBackupError();
};

const createDumpArgs = () => [
  "--host",
  env.DB_HOST,
  "--port",
  String(env.DB_PORT),
  "--user",
  env.DB_USER,
  "--single-transaction",
  "--routines",
  "--triggers",
  "--events",
  "--hex-blob",
  "--set-gtid-purged=OFF",
  "--databases",
  env.DB_NAME,
];

const runDumpToFile = async (filePath, { signal, onProcess } = {}) => {
  throwIfCancelled(signal);

  const dump = spawn(env.DB_BACKUP_DUMP_BINARY, createDumpArgs(), {
    env: {
      ...process.env,
      MYSQL_PWD: env.DB_PASSWORD,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  onProcess?.(dump);

  let stderr = "";
  dump.stderr.setEncoding("utf8");
  dump.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const abortDump = () => {
    dump.stdout.destroy(cancelledBackupError());
    dump.kill("SIGTERM");
  };

  signal?.addEventListener("abort", abortDump, { once: true });

  const exitPromise = new Promise((resolve, reject) => {
    dump.on("error", reject);
    dump.on("close", (code) => {
      signal?.removeEventListener("abort", abortDump);
      if (signal?.aborted) {
        reject(cancelledBackupError());
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new AppError("Database backup dump failed", {
          statusCode: 500,
          code: "DATABASE_BACKUP_DUMP_FAILED",
          details: stderr.trim(),
        }),
      );
    });
  });

  try {
    await Promise.all([pipeline(dump.stdout, createGzip(), createWriteStream(filePath)), exitPromise]);
  } finally {
    signal?.removeEventListener("abort", abortDump);
    onProcess?.(null);
  }
};

const listBackupFiles = async () => {
  const backupDir = resolveBackupDir();
  const entries = await readdir(backupDir).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  const files = await Promise.all(
    entries
      .filter((entry) => entry.startsWith(backupFilePrefix) && entry.endsWith(".sql.gz"))
      .map(async (entry) => {
        const filePath = path.join(backupDir, entry);
        const fileStat = await stat(filePath);
        return { fileName: entry, filePath, createdAtMs: fileStat.birthtimeMs || fileStat.mtimeMs };
      }),
  );

  return files.sort((left, right) => right.createdAtMs - left.createdAtMs);
};

const pruneOldBackups = async () => {
  const files = await listBackupFiles();
  const oldFiles = files.slice(env.DB_BACKUP_RETENTION_COUNT);
  await Promise.all(oldFiles.map((file) => unlink(file.filePath)));
  return oldFiles;
};

const emailBackup = async ({ filePath, fileName, recipientEmail = env.SUPER_ADMIN_EMAIL }) => {
  if (!recipientEmail) {
    throw new AppError("A backup recipient email is required", {
      statusCode: 503,
      code: "DATABASE_BACKUP_RECIPIENT_NOT_CONFIGURED",
    });
  }

  const generatedAt = new Date().toISOString();
  const sameDbCommand = `gunzip -c ~/Downloads/${fileName} \\
  | sed '/GTID_PURGED/d' \\
  | mysql -h ${env.DB_HOST} -P ${env.DB_PORT} -u ${env.DB_USER} -p`;
  const newDbCommand = `gunzip -c ~/Downloads/${fileName} \\
  | sed '/GTID_PURGED/d; s/\`${env.DB_NAME}\`/\`NEW_DATABASE_NAME\`/g' \\
  | mysql -h ${env.DB_HOST} -P ${env.DB_PORT} -u ${env.DB_USER} -p`;

  return nodemailerProvider.send({
    to: recipientEmail,
    subject: `OrnaCore database backup - ${env.DB_NAME}`,
    text: [
      `Database backup for ${env.DB_NAME} is attached.`,
      `Generated at: ${generatedAt}`,
      `File: ${fileName}`,
      "",
      "RESTORE INTO THE SAME DATABASE",
      "Use this when you want to restore back into the original database.",
      sameDbCommand,
      "",
      "RESTORE INTO A NEW DATABASE",
      "Use this when you want to restore into another database. Replace NEW_DATABASE_NAME first.",
      newDbCommand,
      "",
      "Note: If your file is not in Downloads, replace ~/Downloads/ with the actual folder path.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#20211f;line-height:1.55">
        <h2 style="margin:0 0 12px;color:#20211f">OrnaCore database backup</h2>
        <p>Database backup for <strong>${escapeHtml(env.DB_NAME)}</strong> is attached.</p>
        <p><strong>Generated at:</strong> ${escapeHtml(generatedAt)}</p>
        <p><strong>File:</strong> ${escapeHtml(fileName)}</p>

        <hr style="border:0;border-top:1px solid #e6dfd4;margin:20px 0" />

        <h3 style="margin:0 0 8px;color:#20211f">1. Restore into the same database</h3>
        <p style="margin:0 0 10px">Use this when you want to restore back into the original database.</p>
        <pre style="white-space:pre-wrap;background:#f7f3ec;border:1px solid #e6dfd4;border-radius:8px;padding:12px;font-size:13px"><code>${escapeHtml(sameDbCommand)}</code></pre>

        <h3 style="margin:20px 0 8px;color:#20211f">2. Restore into a new database</h3>
        <p style="margin:0 0 10px">
          Use this when you want to restore into another database.
          Replace <strong>NEW_DATABASE_NAME</strong> with your target database name.
        </p>
        <pre style="white-space:pre-wrap;background:#f7f3ec;border:1px solid #e6dfd4;border-radius:8px;padding:12px;font-size:13px"><code>${escapeHtml(newDbCommand)}</code></pre>

        <p style="margin-top:16px;color:#6f6a62;font-size:13px">
          If your file is not in Downloads, replace <strong>~/Downloads/</strong> with the actual folder path.
          MySQL will ask for the database password after you run the command.
        </p>
      </div>
    `,
    attachments: [{ filename: fileName, path: filePath }],
  });
};

const sendBackupEmail = async ({ filePath, fileName, recipientEmail }) => {
  logger.info("Database backup email started", { fileName, recipientEmail });
  const emailResult = await emailBackup({ filePath, fileName, recipientEmail });
  logger.info("Database backup email sent", { fileName, recipientEmail });
  return emailResult;
};

const queueBackupEmail = ({ filePath, fileName, recipientEmail }) => {
  setImmediate(() => {
    sendBackupEmail({ filePath, fileName, recipientEmail }).catch((error) => {
      logger.error("Database backup email failed", { fileName, recipientEmail, error });
    });
  });
};

export const databaseBackupService = {
  sendBackupEmail,

  async createBackup({ email = true, recipientEmail, emailMode = "sync", signal, onDumpProcess } = {}) {
    const backupDir = resolveBackupDir();
    await mkdir(backupDir, { recursive: true });

    const filePath = createBackupFilePath();
    const fileName = path.basename(filePath);

    logger.info("Database backup started", { database: env.DB_NAME, fileName });
    try {
      await runDumpToFile(filePath, { signal, onProcess: onDumpProcess });
      throwIfCancelled(signal);
    } catch (error) {
      if (signal?.aborted || error.code === "DATABASE_BACKUP_CANCELLED") {
        await unlink(filePath).catch(() => {});
      }
      throw error;
    }

    const fileStat = await stat(filePath);
    const pruned = await pruneOldBackups();

    let emailResult = null;
    let emailQueued = false;
    if (email) {
      if (emailMode === "background") {
        queueBackupEmail({ filePath, fileName, recipientEmail });
        emailQueued = true;
      } else {
        emailResult = await sendBackupEmail({ filePath, fileName, recipientEmail });
      }
    }

    logger.info("Database backup completed", {
      fileName,
      sizeBytes: fileStat.size,
      emailed: Boolean(emailResult),
      emailQueued,
      pruned: pruned.map((file) => file.fileName),
    });

    return {
      fileName,
      filePath,
      sizeBytes: fileStat.size,
      emailed: Boolean(emailResult),
      emailQueued,
      recipientEmail: emailResult || emailQueued ? (recipientEmail ?? env.SUPER_ADMIN_EMAIL) : null,
      pruned: pruned.map((file) => file.fileName),
    };
  },
};
