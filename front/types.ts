import type { JSONContent } from "@tiptap/react";

export type User = {
  id: number;
  username: string;
  avatar: string;
  email: string;
  role: string;
  lastActiveAt: string;
  createdAt: string;
};

export type UserDataLogin = {
  username: string;
  avatar: string;
};

export type Notes = {
  id: number;
  title: string;
  slug: string;
  emoji: string;
  pin: boolean;
  mentionMembers: boolean;
  content: JSONContent;
  createdAt: string;
  updatedAt: string;

  // Les relations récupérées via Prisma include
  authorId: number;
  author: User;
  memberIds: User[];
  members: User[];

  className?: string;
  childClassName?: string;
};

export type CreateNote = {
  title: string;
  emoji: string;
  memberIds: number[];
  mentionMembers: boolean;
  content: JSONContent;
  pin: boolean;
};

export type CreateNoteResponse = {
  message: string;
  note: Notes; // Remplace ça par le vrai type de ta note si tu l'as (ex: Note)
};

export type EditNote = {
  id: number;
  title: string;
  emoji: string;
  memberIds: number[];
  mentionMembers: boolean;
  content: JSONContent;
  pin: boolean;
};

export type UpdateNote = {
  id: number;
  title: string;
  emoji: string;
  memberIds: number[];
  mentionMembers: boolean;
  content: JSONContent;
  pin: boolean;
};

export type UpdateNoteResponse = {
  message: string;
  note: Notes; // Remplace ça par le vrai type de ta note si tu l'as (ex: Note)
};

export interface EmojiMartData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
  emoji?: string;
}

export type NoteEditorFormProps = {
  note: Notes;
};

export type ClipImportResult = {
  id: string;
  previewUrl: string;
  sourceUrl: string;
  duration: number;
  width: number;
  height: number;
  sourceType: "upload" | "twitch";
  originalName?: string;
};

export type ClipExportResult = {
  id: string;
  exportUrl: string;
  duration: number;
  width: number;
  height: number;
};

export type TranscribeResult = {
  words: {
    id: string;
    text: string;
    start: number;
    end: number;
  }[];
  language: string;
};

export type SubtitleStyle = {
  preset: "word-pop" | "word-pop-accent";
  fontFamily: string;
  fontSize: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  position: "center" | "lower";
  animation: "pop" | "bounce" | "fade" | "scale";
  glowColor?: string;
  glowIntensity?: number;
  glowSpread?: number;
  layoutX?: number;
  layoutY?: number;
};
