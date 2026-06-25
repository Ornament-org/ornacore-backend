import request from "supertest";
import { createApp } from "../../src/app.js";

describe("authentication route validation", () => {
  it("rejects an invalid admin login payload", async () => {
    const response = await request(createApp())
      .post("/api/v1/admin/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a weak shopkeeper registration password", async () => {
    const response = await request(createApp()).post("/api/v1/shopkeeper/auth/register").send({
      ownerName: "Test Owner",
      shopName: "Test Jewellers",
      email: "shop@example.com",
      password: "weak",
      addressLine1: "1 Test Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects weak test super-admin credentials before touching the database", async () => {
    const response = await request(createApp())
      .post("/api/v1/test/create-super-admin")
      .send({ email: "admin@example.com", password: "weak" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
