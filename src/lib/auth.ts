import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type ExpressUser = {
  id: string;
  email: string;
};

type JwtPayload = {
  sub: string;
  email: string;
};

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "auth_token";
const JWT_SECRET = process.env.AUTH_JWT_SECRET;

if (!JWT_SECRET) {
  // In dev this will surface quickly; in prod it should be set via env
  throw new Error("AUTH_JWT_SECRET is not set");
}

export async function getCurrentExpressUser(): Promise<ExpressUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    return {
      id: decoded.sub,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}


