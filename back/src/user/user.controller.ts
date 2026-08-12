import { Request, Response } from "express";
import { getSpecificUserService, getUsersService } from "./user.service.js";

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await getUsersService();

    console.log(users);
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const getSpecificUser = async (req: Request, res: Response) => {
  try {
    const username = req.params.username;
    if (typeof username !== "string") {
      return res.status(400).json({ error: "Nom d'utilisateur invalide" });
    }

    const user = await getSpecificUserService(username);

    console.log(user);
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};
