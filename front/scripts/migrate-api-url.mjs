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
  if (!content.includes("import.meta.env.VITE_API_URL")) continue;

  const importPath = file.includes(`${path.sep}components${path.sep}`)
    ? "../../lib/apiUrl"
    : "../lib/apiUrl";

  content = content.replace(
    /\$\{import\.meta\.env\.VITE_API_URL\}([^`'"\s]+)/g,
    (_, pathPart) => {
      const normalized = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
      return `\${apiUrl("${normalized}")}`.replace('\\${', '${'); // fix - use apiUrl call not template
    },
  );

  // Above still leaves template - better direct replacement:
  content = fs.readFileSync(file, "utf8");
  content = content.replace(
    /\$\{import\.meta\.env\.VITE_API_URL\}([^`'"\s]+)/g,
    (_, pathPart) => `apiUrl("${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}")`,
  );

  // Fix fetch(`apiUrl(...)`) -> fetch(apiUrl(...))
  content = content.replace(/fetch\(`(apiUrl\([^`]+\))`/g, "fetch($1");
  content = content.replace(/return `(apiUrl\([^`]+\))`/g, "return $1");

  if (!content.includes(`from "${importPath}"`)) {
    content = content.replace(
      /^import .+\n/m,
      (line) => `${line}import { apiUrl } from "${importPath}";\n`,
    );
  }

  fs.writeFileSync(file, content);
  console.log("updated", path.relative(srcRoot, file));
}
