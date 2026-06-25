import { randomInt } from "node:crypto";

const normalizedNamePart = (fullName) => {
  const firstName = String(fullName)
    .normalize("NFKD")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)[0];
  const safeName = firstName?.length >= 2 ? firstName : "Staff";
  return `${safeName[0].toUpperCase()}${safeName.slice(1).toLowerCase()}`;
};

const initials = (fullName) => {
  const value = String(fullName)
    .normalize("NFKD")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0].toUpperCase())
    .join("");
  return value || "STF";
};

export const generateTemporaryStaffPassword = (fullName) =>
  `${normalizedNamePart(fullName)}@${randomInt(100000, 1000000)}`;

export const generateEmployeeCodeCandidate = (fullName, now = new Date()) => {
  const year = String(now.getFullYear()).slice(-2);
  return `OC-${initials(fullName)}-${year}${randomInt(1000, 10000)}`;
};
