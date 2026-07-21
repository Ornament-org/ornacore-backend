import { parseBullionsBiharRates } from "../../src/modules/metal-rates/bullions-bihar.scraper.js";
import { rateUnitDisplay, resolveMetalForParsedRate } from "../../src/modules/metal-rates/metal-rate.service.js";

describe("Bullions Bihar scraper", () => {
  it("parses 24K gold and 999 silver rates as per-gram values", () => {
    const html = `
      <h2>Gold Rate Today in Bihar</h2>
      Last Update : Tuesday, 30 Jun 2026 12:25 PM (India Time)
      <table>
        <tr><td>Name</td><td>1 Gram</td><td>10 Gram</td></tr>
        <tr><td>Gold 24 Karat (Rs ₹)</td><td>14,258</td><td>142,580</td></tr>
      </table>
      <h2>Silver Rate Today in Bihar</h2>
      Last Update : Tuesday, 30 Jun 2026 12:25 PM (India Time)
      <table>
        <tr><td>Name</td><td>1 Gram</td><td>10 Gram</td><td>100 Gram</td><td>1 Kilogram</td></tr>
        <tr><td>Silver 999 Fine (Rs ₹)</td><td>226</td><td>2,265</td><td>22,647</td><td>226,470</td></tr>
      </table>
    `;

    const result = parseBullionsBiharRates(html, {
      sourceUrl: "https://bullions.co.in/location/bihar/",
      location: "Bihar",
    });

    expect(result.sourceName).toBe("bullions.co.in");
    expect(result.sourceLocation).toBe("Bihar");
    expect(result.sourceRawUpdate).toBe("Tuesday, 30 Jun 2026 12:25 PM (India Time)");
    expect(result.rates).toEqual([
      { metalCode: "GOLD", purity: "24K", basePricePerGram: 14258 },
      { metalCode: "SILVER", purity: "999", basePricePerGram: 226.47 },
    ]);
  });

  it("matches parsed metals by name when local metal codes are custom", () => {
    const metals = [
      { id: 1, code: "5555", name: "Gold" },
      { id: 2, code: "66666", name: "Silver" },
    ];

    expect(resolveMetalForParsedRate(metals, { metalCode: "GOLD" })).toBe(metals[0]);
    expect(resolveMetalForParsedRate(metals, { metalCode: "SILVER" })).toBe(metals[1]);
  });

  it("uses correct display multipliers for industry rate units", () => {
    expect(rateUnitDisplay("PER_10G")).toEqual({ displayUnit: "10gm", unitMultiplier: 10 });
    expect(rateUnitDisplay("PER_KG")).toEqual({ displayUnit: "kg", unitMultiplier: 1000 });
    expect(rateUnitDisplay("PER_G")).toEqual({ displayUnit: "gm", unitMultiplier: 1 });
  });
});
