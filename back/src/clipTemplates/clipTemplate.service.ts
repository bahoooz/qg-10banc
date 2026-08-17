import { Prisma } from "@prisma/client";
import { AppError } from "../../utils.js";
import { prisma } from "../lib/prisma.js";
import type {
  ClipTemplatePayload,
  CreateClipTemplateInput,
} from "./clipTemplate.schema.js";

export type ClipTemplateListItem = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ClipTemplateDetail = ClipTemplateListItem & {
  payload: ClipTemplatePayload;
};

export async function listClipTemplatesService(
  userId: number,
): Promise<ClipTemplateListItem[]> {
  return prisma.clipTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getClipTemplateService(
  userId: number,
  templateId: string,
): Promise<ClipTemplateDetail> {
  const template = await prisma.clipTemplate.findFirst({
    where: { id: templateId, userId },
  });

  if (!template) {
    throw new AppError(404, "CLIP_TEMPLATE_NOT_FOUND");
  }

  return {
    id: template.id,
    name: template.name,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    payload: template.payload as ClipTemplatePayload,
  };
}

export async function createClipTemplateService(
  userId: number,
  input: CreateClipTemplateInput,
): Promise<ClipTemplateDetail> {
  try {
    const created = await prisma.clipTemplate.create({
      data: {
        userId,
        name: input.name,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });

    return {
      id: created.id,
      name: created.name,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      payload: created.payload as ClipTemplatePayload,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "CLIP_TEMPLATE_NAME_EXISTS",
        "Une template avec ce nom existe déjà",
      );
    }
    throw error;
  }
}

export async function deleteClipTemplateService(
  userId: number,
  templateId: string,
): Promise<void> {
  const result = await prisma.clipTemplate.deleteMany({
    where: { id: templateId, userId },
  });

  if (result.count === 0) {
    throw new AppError(404, "CLIP_TEMPLATE_NOT_FOUND");
  }
}
