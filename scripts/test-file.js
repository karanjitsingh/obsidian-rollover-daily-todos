import { readFileSync } from "fs";
import { getTodos } from "../src/get-todos.js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: npm run test-file <path-to-file>");
  process.exit(1);
}

const content = readFileSync(filePath, "utf-8");
const lines = content.split(/\r?\n|\r|\n/g);
const result = getTodos({ lines });

console.log(result.join("\n"));
