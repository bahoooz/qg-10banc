import multer from "multer";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, path.join(__dirname, "src/cut/input"));
  },
  filename: (_req, _file, callback) => {
    callback(null, `video.mp4`);
  },
});

export const upload = multer({ storage });
