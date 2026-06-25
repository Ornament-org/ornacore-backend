import request from "supertest";
import { createApp } from "../../src/app.js";

describe("GET /api/v1/health", () => {
  it("returns the API health payload", async () => {
    const response = await request(createApp()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });
});
