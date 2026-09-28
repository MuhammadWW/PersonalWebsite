// Next's static export writes segment prefetch payloads as nested folders
// (e.g. resume/__next.resume/__PAGE__.txt) while the client requests the
// dot-joined name (resume/__next.resume.__PAGE__.txt). Static hosts can't
// rewrite, so write a copy at the requested path next to each nested file.
import { promises as fs } from "node:fs";
import path from "node:path";

const outDir = path.resolve("out");

async function collect(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else files.push(full);
  }
  return files;
}

let copied = 0;

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      for (const file of await collect(full)) {
        const rel = path.relative(full, file).split(path.sep).join(".");
        await fs.copyFile(file, path.join(dir, `${entry.name}.${rel}`));
        copied += 1;
      }
    } else {
      await walk(full);
    }
  }
}

await walk(outDir);
await fs.writeFile(path.join(outDir, ".nojekyll"), "");
console.log(`postbuild: flattened ${copied} prefetch payloads, wrote .nojekyll`);
