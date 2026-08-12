import { Role } from "@prisma/client";

export type DataStatusVideo = {
  name: string;
  done: boolean;
  response?: {
    "@type": string;
    raiMediaFilteredCount: number;
    videos?: { gcsUri: string; mimeType: string }[];
  };
};

// TYPES FOR AUTH

// export type User = {
//   id: number;
//   username: string;
//   email: string;
//   hashedPassword: string;
//   role: Role;
//   lastActiveAt: string;
//   createdAt: string;
// };

// export type UserFormData = {
//   username: string;
//   email: string;
//   password: string;
// }