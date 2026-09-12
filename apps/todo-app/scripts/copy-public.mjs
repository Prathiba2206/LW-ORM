import { cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  await cp(join(__dirname, "../public"), join(__dirname, "../dist/public"), { recursive: true });
}

main().catch(console.error);
