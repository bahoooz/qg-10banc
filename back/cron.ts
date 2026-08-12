import cron from "node-cron";
import { prisma } from "./src/lib/prisma.js";

const baseUrl = process.env.API_URL;
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

cron.schedule(
  "30 12 * * *",
  async () => {
    console.log(
      "Création de la vidéo lancé à ",
      new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
    );

    try {
      const promptRes = await prisma.prompt.findUnique({
        where: { id: 1 },
      });

      const prompt =
        promptRes?.prompt ??
        "Crée un concept de mini-vidéo d’horreur fantaisiste (8 s max) avec une créature mythique, bruyante et sombre dans une plaine. Une seule scène simple, ambiance mystérieuse et assez sombre.";

      const res = await fetch(`${baseUrl}/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
        }),
      });
      if (!res.ok) throw new Error(`generate -> HTTP¨${res.status}`);
      const data = await res.json();
      console.log("Statut du début de la génération de la vidéo : ", data);
      const operationId = data.video.operationId;
      if (!operationId) throw new Error("operationId manquant");

      await delay(180_000);

      const statusRes = await fetch(`${baseUrl}/video/status/${operationId}`, {
        method: "POST",
      });
      if (!statusRes.ok) throw new Error(`status -> HTTP ${statusRes.status}`);
      const dataStatus = await statusRes.json();
      console.log("Statut de la génération de la vidéo : ", dataStatus);
      const localUrl = dataStatus.localUrl;
      if (!localUrl) throw new Error("localUrl manquant");

      const tiktokPostRes = await fetch(
        `${baseUrl}/tiktok/upload-draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            video_url: localUrl,
            operationId
          }),
        }
      );
      if (!tiktokPostRes.ok)
        throw new Error(`tiktokPost -> HTTP ${tiktokPostRes.status}`);
      const dataTiktokPost = await tiktokPostRes.json();
      console.log("Statut du post tiktok :", dataTiktokPost);
      console.log(
        "Création et post de la vidéo terminé à ",
        new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
      );
    } catch (error) {
      console.log("Cron error :", error);
    }
  },
  {
    timezone: "Europe/Paris",
  }
);

cron.schedule(
  "40 12 * * *",
  async () => {
    console.log(
      "Création de la vidéo lancé à ",
      new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
    );

    try {
      const promptRes = await prisma.prompt.findUnique({
        where: { id: 2 },
      });

      const prompt =
        promptRes?.prompt ??
        "Crée un concept de mini-vidéo d’horreur fantaisiste (8 s max) avec une créature mythique, bruyante et sombre dans une plaine. Une seule scène simple, ambiance mystérieuse et assez sombre.";

      const res = await fetch(`${baseUrl}/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
        }),
      });
      if (!res.ok) throw new Error(`generate -> HTTP¨${res.status}`);
      const data = await res.json();
      console.log("Statut du début de la génération de la vidéo : ", data);
      const operationId = data.video.operationId;
      if (!operationId) throw new Error("operationId manquant");

      await delay(180_000);

      const statusRes = await fetch(`${baseUrl}/video/status/${operationId}`, {
        method: "POST",
      });
      if (!statusRes.ok) throw new Error(`status -> HTTP ${statusRes.status}`);
      const dataStatus = await statusRes.json();
      console.log("Statut de la génération de la vidéo : ", dataStatus);
      const localUrl = dataStatus.localUrl;
      if (!localUrl) throw new Error("localUrl manquant");

      const tiktokPostRes = await fetch(
        `${baseUrl}/tiktok/upload-draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            video_url: localUrl,
            operationId
          }),
        }
      );
      if (!tiktokPostRes.ok)
        throw new Error(`tiktokPost -> HTTP ${tiktokPostRes.status}`);
      const dataTiktokPost = await tiktokPostRes.json();
      console.log("Statut du post tiktok :", dataTiktokPost);
      console.log(
        "Création et post de la vidéo terminé à ",
        new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
      );
    } catch (error) {
      console.log("Cron error :", error);
    }
  },
  {
    timezone: "Europe/Paris",
  }
);

cron.schedule(
  "50 12 * * *",
  async () => {
    console.log(
      "Création de la vidéo lancé à ",
      new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
    );

    try {
      const promptRes = await prisma.prompt.findUnique({
        where: { id: 3 },
      });

      const prompt =
        promptRes?.prompt ??
        "Crée un concept de mini-vidéo d’horreur fantaisiste (8 s max) avec une créature mythique, bruyante et sombre dans une plaine. Une seule scène simple, ambiance mystérieuse et assez sombre.";

      const res = await fetch(`${baseUrl}/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
        }),
      });
      if (!res.ok) throw new Error(`generate -> HTTP¨${res.status}`);
      const data = await res.json();
      console.log("Statut du début de la génération de la vidéo : ", data);
      const operationId = data.video.operationId;
      if (!operationId) throw new Error("operationId manquant");

      await delay(180_000);

      const statusRes = await fetch(`${baseUrl}/video/status/${operationId}`, {
        method: "POST",
      });
      if (!statusRes.ok) throw new Error(`status -> HTTP ${statusRes.status}`);
      const dataStatus = await statusRes.json();
      console.log("Statut de la génération de la vidéo : ", dataStatus);
      const localUrl = dataStatus.localUrl;
      if (!localUrl) throw new Error("localUrl manquant");

      const tiktokPostRes = await fetch(
        `${baseUrl}/tiktok/upload-draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            video_url: localUrl,
            operationId
          }),
        }
      );
      if (!tiktokPostRes.ok)
        throw new Error(`tiktokPost -> HTTP ${tiktokPostRes.status}`);
      const dataTiktokPost = await tiktokPostRes.json();
      console.log("Statut du post tiktok :", dataTiktokPost);
      console.log(
        "Création et post de la vidéo terminé à ",
        new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
      );
    } catch (error) {
      console.log("Cron error :", error);
    }
  },
  {
    timezone: "Europe/Paris",
  }
);

cron.schedule(
  "00 13 * * *",
  async () => {
    console.log(
      "Création de la vidéo lancé à ",
      new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
    );

    try {
      const promptRes = await prisma.prompt.findUnique({
        where: { id: 4 },
      });

      const prompt =
        promptRes?.prompt ??
        "Crée un concept de mini-vidéo d’horreur fantaisiste (8 s max) avec une créature mythique, bruyante et sombre dans une plaine. Une seule scène simple, ambiance mystérieuse et assez sombre.";

      const res = await fetch(`${baseUrl}/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
        }),
      });
      if (!res.ok) throw new Error(`generate -> HTTP¨${res.status}`);
      const data = await res.json();
      console.log("Statut du début de la génération de la vidéo : ", data);
      const operationId = data.video.operationId;
      if (!operationId) throw new Error("operationId manquant");

      await delay(180_000);

      const statusRes = await fetch(`${baseUrl}/video/status/${operationId}`, {
        method: "POST",
      });
      if (!statusRes.ok) throw new Error(`status -> HTTP ${statusRes.status}`);
      const dataStatus = await statusRes.json();
      console.log("Statut de la génération de la vidéo : ", dataStatus);
      const localUrl = dataStatus.localUrl;
      if (!localUrl) throw new Error("localUrl manquant");

      const tiktokPostRes = await fetch(
        `${baseUrl}/tiktok/upload-draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            video_url: localUrl,
            operationId
          }),
        }
      );
      if (!tiktokPostRes.ok)
        throw new Error(`tiktokPost -> HTTP ${tiktokPostRes.status}`);
      const dataTiktokPost = await tiktokPostRes.json();
      console.log("Statut du post tiktok :", dataTiktokPost);
      console.log(
        "Création et post de la vidéo terminé à ",
        new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
      );
    } catch (error) {
      console.log("Cron error :", error);
    }
  },
  {
    timezone: "Europe/Paris",
  }
);
