export const moneyToMinorUnits = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) throw new TypeError("Money value must be numeric");
  return Math.round(normalized * 100);
};

export const minorUnitsToMoney = (value) => (Number(value) / 100).toFixed(2);
