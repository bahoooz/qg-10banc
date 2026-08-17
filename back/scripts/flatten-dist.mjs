import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const nestedBackDir = path.join(distDir, "back");

if (!fs.existsSync(nestedBackDir)) {
  process.exit(0);
}

console.warn(
  "[build] Structure dist/back/ détectée — fusion vers dist/ (vérifiez rootDir dans tsconfig).",
);

for (const entry of fs.readdirSync(nestedBackDir)) {
  const sourcePath = path.join(nestedBackDir, entry);
  const targetPath = path.join(distDir, entry);

  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  fs.renameSync(sourcePath, targetPath);
}

fs.rmdirSync(nestedBackDir);
