import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../services/core/storage";
const root = path.resolve(dataDir, "artifacts");
const cutoff = Date.now() - 86400000;
let removed = 0;
async function walk(dir: string) {
  for (const entry of await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => [])) {
    const file = path.resolve(dir, entry.name);
    if (!file.startsWith(root + path.sep))
      throw new Error("Cleanup path escaped local artifacts");
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await walk(file);
    else if (
      (file.includes(path.sep + "work" + path.sep) ||
        file.includes(path.sep + "uploads" + path.sep)) &&
      (await fs.stat(file)).mtimeMs < cutoff
    ) {
      await fs.unlink(file);
      removed++;
    }
  }
}
await walk(root);
console.log(
  `Removed ${removed} temporary files older than 24 hours. Saved revisions, narration and exports were retained.`,
);
