-- CreateTable
CREATE TABLE "Prompt" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT 'Crée un concept de mini-vidéo d’horreur fantaisiste (8 s max) avec une créature mythique, bruyante et sombre dans une plaine. Une seule scène simple, ambiance mystérieuse et assez sombre.',

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);
