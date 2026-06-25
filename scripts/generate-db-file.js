import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [type, rawName] = process.argv.slice(2);
const supportedTypes = new Set(["migration", "seed"]);

if (!supportedTypes.has(type) || !rawName) {
  console.error("Usage: npm run db:migration:create -- <name> or npm run db:seed:create -- <name>");
  process.exit(1);
}

const name = rawName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

if (!name) {
  console.error("The migration or seed name must contain letters or numbers.");
  process.exit(1);
}

const now = new Date();
const timestamp = [
  now.getUTCFullYear(),
  String(now.getUTCMonth() + 1).padStart(2, "0"),
  String(now.getUTCDate()).padStart(2, "0"),
  String(now.getUTCHours()).padStart(2, "0"),
  String(now.getUTCMinutes()).padStart(2, "0"),
  String(now.getUTCSeconds()).padStart(2, "0"),
].join("");

const directory = type === "migration" ? "src/database/migrations" : "src/database/seeders";
const filename = `${timestamp}-${name}.cjs`;
const target = path.resolve(directory, filename);
const template =
  type === "migration"
    ? `"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    void queryInterface;
    void Sequelize;
  },

  async down(queryInterface, Sequelize) {
    void queryInterface;
    void Sequelize;
  },
};
`
    : `"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    void queryInterface;
    void Sequelize;
  },

  async down(queryInterface, Sequelize) {
    void queryInterface;
    void Sequelize;
  },
};
`;

await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, template, { flag: "wx" });
console.log(`Created ${path.relative(process.cwd(), target)}`);
