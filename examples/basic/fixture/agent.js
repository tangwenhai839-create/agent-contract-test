import fs from "node:fs";

fs.mkdirSync("src", { recursive: true });
fs.writeFileSync("src/ready.js", "export const ready = true;\n");
