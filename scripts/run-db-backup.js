import db from "../src/database/models/InitializeModels.js";
import { databaseBackupService } from "../src/modules/maintenance/database-backup.service.js";

try {
  await db.sequelize.authenticate();
  const result = await databaseBackupService.createBackup({ email: true });
  console.log("Database backup created and emailed:", {
    fileName: result.fileName,
    sizeBytes: result.sizeBytes,
    emailed: result.emailed,
    pruned: result.pruned,
  });
} finally {
  await db.sequelize.close();
}
