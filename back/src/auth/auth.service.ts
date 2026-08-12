import { TLoginSchema, TSignupSchema } from "../../schemas/authSchema.js";
import { AppError } from "../../utils.js";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const GATEKEEPER_PASSWORD = process.env.GATEKEEPER_PASSWORD;

if (!JWT_SECRET) throw new AppError(500, "INTERNAL_SERVER_ERROR");

if (!GATEKEEPER_PASSWORD) throw new AppError(500, "INTERNAL_SERVER_ERROR");

export const createUserService = async (formData: TSignupSchema) => {
  const { username, email, password } = formData;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser)
    throw new AppError(
      409,
      "ACCOUNT_ALREADY_EXISTS",
    );

  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      hashedPassword: hashedPassword,
      lastActiveAt: new Date(),
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  });

  return newUser;
};

export const loginService = async ({ username, password }: TLoginSchema) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      hashedPassword: true,
      createdAt: true,
    },
  });

  if (!user) throw new AppError(401, "INVALID_CREDENTIALS");

  const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

  if (!isPasswordValid) throw new AppError(401, "INVALID_CREDENTIALS");

  const payload = {
    type: "user_session",
    id: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
  });

  const { hashedPassword, ...userData } = user;

  return {
    token,
    user: userData,
  };
};

export const getSessionService = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      email: true,
      role: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });

  if (!user)
    throw new AppError(401, "SESSION_NOT_FOUND");

  return user;
};

export const verifyAndTokenGatekeeperService = async (password: string) => {
  if (password !== GATEKEEPER_PASSWORD) {
    throw new AppError(401, "INVALID_CREDENTIALS");
  }

  const token = jwt.sign({ role: "access_profiles" }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return token;
};

export const checkGatekeeperService = async (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

  return decoded;
};

export const checkLoginService = async (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

  return decoded;
};

export const heartbeatService = async (userId: number) => {
  const heartbeat = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      lastActiveAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  return heartbeat;
};
