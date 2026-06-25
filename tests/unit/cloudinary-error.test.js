import { normalizeCloudinaryProviderError } from "../../src/integrations/cloudinary/cloudinary.service.js";

describe("Cloudinary provider error normalization", () => {
  it("returns an actionable authentication error without exposing credentials", () => {
    const error = normalizeCloudinaryProviderError(
      { message: "Unknown API key", http_code: 401 },
      "upload",
    );

    expect(error.code).toBe("CLOUDINARY_AUTHENTICATION_FAILED");
    expect(error.statusCode).toBe(502);
    expect(error.message).toContain("Cloud Name");
    expect(error.details.providerMessage).toBe("Unknown API key");
  });

  it("returns an actionable network error", () => {
    const error = normalizeCloudinaryProviderError(
      { message: "getaddrinfo ENOTFOUND api.cloudinary.com", code: "ENOTFOUND" },
      "upload",
    );

    expect(error.code).toBe("CLOUDINARY_UNAVAILABLE");
    expect(error.statusCode).toBe(503);
  });

  it("preserves a safe provider message for other Cloudinary failures", () => {
    const error = normalizeCloudinaryProviderError(
      { message: "Invalid image file", http_code: 400 },
      "upload",
    );

    expect(error.code).toBe("CLOUDINARY_REQUEST_FAILED");
    expect(error.message).toBe("Cloudinary upload failed: Invalid image file");
  });
});
