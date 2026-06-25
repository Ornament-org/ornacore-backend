import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const generateNumericOtp = (digits = 6) => {
  if (!Number.isInteger(digits) || digits < 4 || digits > 8) {
    throw new RangeError("OTP digits must be an integer between 4 and 8");
  }

  const minimum = 10 ** (digits - 1);
  const maximum = 10 ** digits;
  return String(randomInt(minimum, maximum));
};

export const hashSecret = (value) => createHash("sha256").update(value).digest("hex");

export const compareSecretHash = (value, expectedHash) => {
  const actual = Buffer.from(hashSecret(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
