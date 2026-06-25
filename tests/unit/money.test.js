import { minorUnitsToMoney, moneyToMinorUnits } from "../../src/shared/utils/money.js";

describe("money utilities", () => {
  it("converts INR amounts to minor units without floating-point drift", () => {
    expect(moneyToMinorUnits("123.45")).toBe(12345);
    expect(minorUnitsToMoney(12345)).toBe("123.45");
  });
});
