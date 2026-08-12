import { NextFunction, Request, Response } from "express";
import {
  createNoteService,
  deleteNoteService,
  getNotesService,
  getPinnedNotesService,
  getSpecificNoteService,
  pinNoteService,
  updateNoteService,
} from "./notes.service.js";
import { noteSchema } from "../../schemas/noteSchema.js";
import { AuthRequest } from "../../middlewares/authHandler.js";
import { AppError } from "../../utils.js";
import { mailService } from "../lib/mail.js";

export const getNotes = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const notes = await getNotesService();
    console.log(notes);
    return res.status(200).json(notes);
  } catch (error) {
    next(error);
  }
};

export const getPinnedNotes = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const notes = await getPinnedNotesService();
    console.log(notes);
    return res.status(200).json(notes);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = noteSchema.parse(req.body);

    const authorId = req.user?.id;

    if (!authorId) throw new AppError(401, "USER_NOT_FOUND");

    const newNote = await createNoteService(validatedData, authorId);

    const memberEmails = newNote.members.map((m) => m.email);

    if (memberEmails.length > 0 && newNote.mentionMembers) {
      mailService
        .mentionMembersNote({
          emails: memberEmails,
          noteTitle: newNote.title,
          author: newNote.author.username,
          slug: newNote.slug,
        })
        .catch((error) => console.error("Erreur mail :", error));
    }

    return res.status(200).json({
      message: "La note a été crée avec succès",
      note: newNote,
    });
  } catch (error) {
    next(error);
  }
};

export const getSpecificNote = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slug = req.params.slug;
    if (typeof slug !== "string") {
      return res.status(400).json({ error: "Slug invalide" });
    }
    const note = await getSpecificNoteService(slug);
    console.log(note);
    return res.status(200).json(note);
  } catch (error) {
    next(error);
  }
};

export const pinNote = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const pinnedNote = await pinNoteService(Number(id));
    console.log(pinnedNote);
    return res.status(200).json(pinnedNote);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const validatedData = noteSchema.parse(req.body);
    const authorId = req.user?.id;
    if (!authorId) throw new AppError(401, "USER_NOT_FOUND");

    const updatedNote = await updateNoteService(
      validatedData,
      Number(id),
      authorId,
    );
    console.log(updatedNote);
    return res.status(200).json({
      message: "La note a été mise à jour avec succès",
      note: updatedNote,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const deletedNote = await deleteNoteService(Number(id));
    console.log(deletedNote);
    return res.status(200).json({
      message: "La note a été supprimée avec succès",
      note: deletedNote,
    });
  } catch (error) {
    next(error);
  }
};
