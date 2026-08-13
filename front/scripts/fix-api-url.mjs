import fs from "fs";
import path from "path";

const fixes = [
  ["front/src/hooks/useGetNote.ts", 'apiUrl("/notes/${slug}")', "apiUrl(`/notes/${slug}`)"],
  ["front/src/hooks/useSpecificUser.ts", 'apiUrl("/users/${username}")', "apiUrl(`/users/${username}`)"],
  ["front/src/hooks/usePinNote.ts", 'apiUrl("/notes/pin/${id}")', "apiUrl(`/notes/pin/${id}`)"],
  ["front/src/hooks/useDeleteNote.ts", '`apiUrl("/notes/delete/${id}")`', "apiUrl(`/notes/delete/${id}`)"],
  ["front/src/hooks/useUpdateNote.ts", '`apiUrl("/notes/update/${data.id}")`', "apiUrl(`/notes/update/${data.id}`)"],
  ["front/src/hooks/useTranscribeClip.ts", '`apiUrl("/clips/${clipId}/transcribe")`', "apiUrl(`/clips/${clipId}/transcribe`)"],
  ["front/src/hooks/useExportClip.ts", '`apiUrl("/clips/${payload.clipId}/export")`', "apiUrl(`/clips/${payload.clipId}/export`)"],
  ["front/src/hooks/useExportClip.ts", '`apiUrl("/clips/export-jobs/${jobId}")`', "apiUrl(`/clips/export-jobs/${jobId}`)"],
  ["front/src/components/Gatekeeper/InputAccess.tsx", '`apiUrl("/auth/gatekeeper/login")`', 'apiUrl("/auth/gatekeeper/login")'],
  ["front/src/components/Guards/GateKeeperGuard.tsx", '`apiUrl("/auth/gatekeeper/check")`', 'apiUrl("/auth/gatekeeper/check")'],
  ["front/src/components/Guards/AuthGuard.tsx", '`apiUrl("/auth/login/check")`', 'apiUrl("/auth/login/check")'],
];

const root = path.join(import.meta.dirname, "..", "..");

for (const [rel, from, to] of fixes) {
  const file = path.join(root, rel);
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes(from)) {
    console.warn("skip (not found):", rel, from);
    continue;
  }
  c = c.replace(from, to);
  fs.writeFileSync(file, c);
  console.log("fixed", rel);
}

// Ensure apiUrl import in all files using apiUrl
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

for (const file of walk(path.join(root, "front", "src"))) {
  if (file.endsWith("apiUrl.ts")) continue;
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes("apiUrl(")) continue;
  const importPath = file.includes(`${path.sep}components${path.sep}`)
    ? "../../lib/apiUrl"
    : "../lib/apiUrl";
  if (c.includes(`from "${importPath}"`)) continue;
  c = c.replace(/^import .+\n/m, (line) => `${line}import { apiUrl } from "${importPath}";\n`);
  fs.writeFileSync(file, c);
  console.log("import added", path.relative(root, file));
}
