import { z } from "zod";
import { getAllSubtitleFontIds } from "./subtitleFonts.config.js";

export const subtitleFontIdSchema = z.enum(getAllSubtitleFontIds());
