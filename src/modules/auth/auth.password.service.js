import bcrypt from "bcrypt";
import { env } from "../../config/env.js";

export const hashPassword = (plainTextPassword) =>
  bcrypt.hash(plainTextPassword, env.BCRYPT_ROUNDS);

export const verifyPassword = (plainTextPassword, passwordHash) =>
  bcrypt.compare(plainTextPassword, passwordHash);
