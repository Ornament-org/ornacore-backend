import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

const commonOptions = {
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    ...commonOptions,
    expiresIn: env.JWT_ACCESS_TTL,
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    ...commonOptions,
    expiresIn: env.JWT_REFRESH_TTL,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET, commonOptions);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, commonOptions);
