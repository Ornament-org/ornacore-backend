import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/modules/auth/auth.token.service.js";

describe("authentication tokens", () => {
  it("signs and verifies access-token claims", () => {
    const token = signAccessToken({
      sub: "123",
      type: "access",
      actorType: "ADMIN",
      roles: ["SUPER_ADMIN"],
      permissions: ["staff.view"],
    });

    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("123");
    expect(payload.type).toBe("access");
    expect(payload.actorType).toBe("ADMIN");
  });

  it("signs and verifies refresh-token claims", () => {
    const token = signRefreshToken({
      sub: "123",
      type: "refresh",
      familyId: "family-id",
      tokenId: "token-id",
    });

    const payload = verifyRefreshToken(token);
    expect(payload.type).toBe("refresh");
    expect(payload.familyId).toBe("family-id");
  });
});
