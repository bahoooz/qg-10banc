import fs from "fs";
import path from "path";

const srcRoot = path.join(import.meta.dirname, "..", "src");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

for (const file of walk(srcRoot)) {
  if (file.endsWith(`${path.sep}lib${path.sep}apiUrl.ts`)) continue;

  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("apiUrl(")) continue;

  const importPath = file.includes(`${path.sep}components${path.sep}`)
    ? "../../lib/apiUrl"
    : "../lib/apiUrl";

  if (content.includes(`from "${importPath}"`)) continue;

  const lines = content.split("\n");
  let insertAt = 0;
  while (insertAt < lines.length && lines[insertAt].startsWith("import ")) {
    insertAt += 1;
  }

  lines.splice(insertAt, 0, `import { apiUrl } from "${importPath}";`);
  fs.writeFileSync(file, lines.join("\n"));
  console.log("import", path.relative(srcRoot, file));
}
