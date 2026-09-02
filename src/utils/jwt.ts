import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ahununu-dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

export interface JwtPayload {
  userId: string;
  role: string;
  departmentId: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
