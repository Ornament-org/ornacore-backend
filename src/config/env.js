import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("OrnaCore API"),
  APP_HOST: z.string().min(1).default("0.0.0.0"),
  APP_PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.url(),
  ADMIN_APP_URL: z.url().default("http://localhost:5173"),
  APP_TIMEZONE: z.string().min(1).default("Asia/Kolkata"),
  APP_CURRENCY: z.literal("INR").default("INR"),
  API_PREFIX: z.string().startsWith("/").default("/api/v1"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_TIMEZONE: z.string().default("+00:00"),
  DB_LOGGING: booleanString,
  DB_POOL_MIN: z.coerce.number().int().nonnegative().default(0),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  REDIS_ENABLED: booleanString,
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  JWT_ISSUER: z.string().default("ornacore-backend"),
  JWT_AUDIENCE: z.string().default("ornacore-clients"),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  SUPER_ADMIN_EMAIL: optionalString,
  SUPER_ADMIN_PASSWORD: optionalString,

  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  TRUST_PROXY: booleanString,

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanString,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: optionalString,
  SMTP_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  MAIL_FROM_NAME: z.string().default("OrnaCore"),
  MAIL_FROM_ADDRESS: z.email().default("no-reply@example.com"),

  MEDIA_STORAGE_PROVIDER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_ROOT_FOLDER: z.string().default("ornacore/dev"),
  LOCAL_UPLOAD_DIR: z.string().min(1).default("uploads"),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),

  COOKIE_SECURE: booleanString,
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  COOKIE_DOMAIN: optionalString,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze(parsed.data);
