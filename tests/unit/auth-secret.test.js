import {
  compareSecretHash,
  generateNumericOtp,
  hashSecret,
} from "../../src/modules/auth/auth.secret.service.js";

describe("authentication secret utilities", () => {
  it("generates a six-digit OTP", () => {
    expect(generateNumericOtp()).toMatch(/^\d{6}$/);
  });

  it("rejects unsafe OTP lengths", () => {
    expect(() => generateNumericOtp(3)).toThrow(RangeError);
  });

  it("compares secret hashes without comparing plain text", () => {
    const hash = hashSecret("123456");

    expect(compareSecretHash("123456", hash)).toBe(true);
    expect(compareSecretHash("654321", hash)).toBe(false);
  });
});
