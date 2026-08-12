import { TNoteSchema } from "../../schemas/noteSchema.js";
import { AppError } from "../../utils.js";
import { formatSlug } from "../lib/format.js";
import { prisma } from "../lib/prisma.js";

export const getNotesService = async () => {
  const notes = await prisma.note.findMany({
    include: {
      members: true,
      author: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    where: {
      pin: false,
    },
  });

  return notes;
};

export const getPinnedNotesService = async () => {
  const notes = await prisma.note.findMany({
    include: {
      members: true,
      author: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    where: {
      pin: true,
    },
  });

  return notes;
};

export const createNoteService = async (
  noteData: TNoteSchema,
  authorId: number,
) => {
  const { title, emoji, content, memberIds, mentionMembers, pin } = noteData;

  const slug = formatSlug(title);

  const newNote = await prisma.note.create({
    data: {
      title,
      slug,
      emoji,
      content,
      mentionMembers,
      members: {
        connect: memberIds.map((id) => ({ id })),
      },
      authorId: Number(authorId),
      pin,
    },
    include: {      
      members: {
        select: {
          email: true,
          username: true,
        },
      },
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  return newNote;
};

export const getSpecificNoteService = async (slug: string) => {
  const note = await prisma.note.findUnique({
    where: {
      slug,
    },
    include: {
      members: true,
      author: true,
    },
  });

  return note;
};

export const pinNoteService = async (id: number) => {
  const note = await prisma.note.findUnique({
    where: {
      id,
    },
  });

  if (!note) throw new AppError(404, "NOTE_NOT_FOUND");

  const pinnedNote = await prisma.note.update({
    where: {
      id,
    },
    data: {
      pin: !note.pin,
    },
  });

  return pinnedNote;
};

export const updateNoteService = async (
  noteData: TNoteSchema,
  id: number,
  authorId: number,
) => {
  const { title, emoji, content, memberIds, mentionMembers, pin } = noteData;

  const slug = formatSlug(title);

  const existingNote = await prisma.note.findUnique({
    where: {
      id,
    },
  });

  if (!existingNote) throw new AppError(404, "NOTE_NOT_FOUND");

  const updatedNote = await prisma.note.update({
    where: {
      id,
    },
    data: {
      title,
      slug,
      emoji,
      content,
      mentionMembers,
      members: {
        set: memberIds.map((id) => ({ id })),
      },
      authorId: Number(authorId),
      pin,
    },
  });

  return updatedNote;
};

export const deleteNoteService = async (id: number) => {
  const existingNote = await prisma.note.findUnique({
    where: {
      id,
    },
  });

  if (!existingNote) throw new AppError(404, "NOTE_NOT_FOUND");

  const deletedNote = await prisma.note.delete({
    where: {
      id,
    },
  });

  return deletedNote;
};
