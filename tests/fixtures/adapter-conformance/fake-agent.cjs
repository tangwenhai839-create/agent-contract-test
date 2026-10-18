const fs = require("node:fs");
const path = require("node:path");

const prompt = process.env.AGENT_CONTRACT_PROMPT;
if (!prompt) throw new Error("AGENT_CONTRACT_PROMPT was not provided");

fs.mkdirSync("src", { recursive: true });
fs.writeFileSync(
  path.join("src", "result.js"),
  `export const taskPrompt = ${JSON.stringify(prompt)};\n`
);
