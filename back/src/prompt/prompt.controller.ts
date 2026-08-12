import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getPrompts = async (_req: Request, res: Response) => {
  try {
    const prompts = await prisma.prompt.findMany({
      orderBy: {
        id: "asc",
      },
    });

    if (prompts.length === 0)
      return res.status(200).json({ message: "Aucun prompt" });

    return res.status(200).json({ message: "Voici les prompts : ", prompts });
  } catch (error) {
    console.error("Erreur : ", error);
    return res.status(500).json({ error: "Internal Error Server" });
  }
};

export const getCurrentPrompt = async (req: Request, res: Response) => {
  try {
    const promptId = Number(req.params.id);
    console.log("CURRENT PROMPT ID : " + promptId);

    const currentFullPrompt = await prisma.prompt.findUnique({
      where: {
        id: promptId,
      },
    });

    if (!currentFullPrompt)
      return res
        .status(404)
        .json({ error: `Le prompt avec l'ID ${promptId} n'existe pas` });

    const currentPrompt = currentFullPrompt.prompt;

    return res
      .status(200)
      .json({ message: "Voici le prompt : ", currentPrompt });
  } catch (error) {
    console.error("Erreur : ", error);
    return res.status(500).json({ error: "Internal Error Server" });
  }
};

export const updatePrompt = async (req: Request, res: Response) => {
  try {
    const dataPrompt = req.body;
    const promptId = Number(req.params.id);
    console.log("PROMPT ID : " + promptId);

    // console.log(dataPrompt);

    let { intro, place, habit, rapText, rapSpeed, animal, instrumentalFlow } =
      dataPrompt;

    console.log(
      intro,
      place,
      habit,
      rapText,
      rapSpeed,
      animal,
      instrumentalFlow
    );

    intro = intro.trim();
    place = place.trim().toLowerCase();
    habit = habit.trim().toLowerCase();
    rapText = rapText.trim();

    const prompt = `${intro}, ${place}, qui fait un rap en français, ${habit}. ${
      rapSpeed === "fastNervous"
        ? "Elle rappe rapidement en français avec un flow énervé inspiré de Ninho"
        : rapSpeed === "fastAmbient"
        ? "Elle rappe rapidement en français avec un flow ambiançant inspiré de Ninho"
        : rapSpeed === "fastMelancholy"
        ? "Elle rappe rapidement en français avec un flow mélancolique inspiré de Ninho"
        : rapSpeed === "slowNervous"
        ? "Elle rappe lentement en français avec un flow énervé inspiré de Ninho"
        : rapSpeed === "slowAmbient"
        ? "Elle rappe lentement en français avec un flow ambiançant inspiré de Ninho"
        : rapSpeed === "slowMelancholy"
        ? "Elle rappe lentement en français avec un flow mélancolique inspiré de Ninho"
        : "Elle rappe rapidement en français avec un flow énervé inspiré de Ninho"
    }, entrain de faire un clip de rap${
      animal ? ` avec un(e) ${animal}` : ""
    }. Le clip est filmé façon zoom et dézoom, le texte du rap est : "${rapText}" ${
      instrumentalFlow === "nervous"
        ? "avec une instrumentale rap qu'on entend bien en fond du rap"
        : instrumentalFlow === "ambient"
        ? "avec une instrumentale rap ambiançante qu'on entend bien en fond du rap"
        : instrumentalFlow === "melancholy"
        ? "avec une instrumentale rap mélancolique qu'on entend bien en fond du rap"
        : "avec une instrumentale rap qu'on entend bien en fond du rap"
    }`;

    const existingPrompt = await prisma.prompt.findUnique({
      where: {
        id: promptId,
      },
    });

    if (!existingPrompt) {
      return res.status(404).json({ error: "Le prompt n'existe pas" });
    }

    const updatedPrompt = await prisma.prompt.update({
      where: {
        id: promptId,
      },
      data: {
        intro,
        place,
        habit,
        rapText,
        rapSpeed,
        animal,
        instrumentalFlow,
        prompt,
      },
    });

    // console.log(updatedPrompt);
    return res
      .status(200)
      .json({ message: "Le prompt a bien été mis à jour : ", updatedPrompt });
  } catch (error) {
    console.error("Erreur : ", error);
    return res.status(500).json({ error: "Internal Error Server" });
  }
};
