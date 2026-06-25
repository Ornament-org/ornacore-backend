import { beforeEach, describe, expect, it, jest } from "@jest/globals";

describe("khatabookRepository", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("loads shopkeeper user contact using the users.mobile column", async () => {
    const findByPk = jest.fn();

    jest.unstable_mockModule("../../src/database/models/InitializeModels.js", () => ({
      default: {
        User: { name: "User" },
        Metal: {},
        KhatabookOrderItem: {},
        KhatabookCollection: {},
        KhatabookSettlement: {},
        ShopkeeperMetalCreditLimit: {},
        ShopkeeperProfile: { findByPk },
      },
    }));

    const { khatabookRepository } = await import(
      "../../src/modules/khatabook/khatabook.repository.js"
    );

    khatabookRepository.findShopkeeper(1);

    const include = findByPk.mock.calls[0][1].include;
    const userInclude = include.find((entry) => entry.as === "user");

    expect(userInclude.attributes).toEqual(["id", "email", "mobile"]);
    expect(userInclude.attributes).not.toContain("phone");
  });
});
