import request from "supertest";
import { createApp } from "../../src/app.js";

describe("CORS", () => {
  it.each(["https://wolfan.jipanditji.com", "https://tool.wolfan.jipanditji.com"])(
    "allows production frontend origin %s",
    async (origin) => {
      const response = await request(createApp()).get("/").set("Origin", origin);

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    },
  );

  it("allows production frontend preflight requests", async () => {
    const response = await request(createApp())
      .options("/api/v1/shopkeeper/auth/otp-login/request")
      .set("Origin", "https://wolfan.jipanditji.com")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://wolfan.jipanditji.com");
  });
});
