import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, users } from "./db/client";
import { eq } from "drizzle-orm";
import { z } from "zod";

const app = express();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.AUTH_JWT_SECRET;
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "auth_token";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

if (!JWT_SECRET) {
  throw new Error("AUTH_JWT_SECRET is not set");
}

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type JwtPayload = {
  sub: string;
  email: string;
};

function signToken(user: { id: string; email: string }) {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: "7d",
  });
}

function setAuthCookie(res: express.Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

app.post("/auth/register", async (req, res) => {
  const parseResult = authSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { email, password } = parseResult.data;

  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (existing) {
    return res.status(409).json({ error: "email_taken" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [created] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();

  const token = signToken({ id: created.id, email: created.email });
  setAuthCookie(res, token);

  return res.status(201).json({
    id: created.id,
    email: created.email,
  });
});

app.post("/auth/login", async (req, res) => {
  const parseResult = authSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { email, password } = parseResult.data;

  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (!existing) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const valid = await bcrypt.compare(password, existing.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = signToken({ id: existing.id, email: existing.email });
  setAuthCookie(res, token);

  return res.json({
    id: existing.id,
    email: existing.email,
  });
});

app.post("/auth/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
  });
  return res.status(204).end();
});

app.get("/auth/me", (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return res.json({
      id: decoded.sub,
      email: decoded.email,
    });
  } catch {
    return res.status(401).json({ user: null });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth service listening on port ${PORT}`);
});
