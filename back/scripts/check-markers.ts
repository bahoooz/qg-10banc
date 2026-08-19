import "../loadEnv.js";
import { prisma } from "../src/lib/prisma.js";

const count = await prisma.streamMarker.count();
const rows = await prisma.streamMarker.findMany({
  take: 10,
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    streamerId: true,
    pressedAt: true,
    obsTimecode: true,
    createdAt: true,
  },
});

console.log("markers count:", count);
console.log(JSON.stringify(rows, null, 2));

await prisma.$disconnect();
