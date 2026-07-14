import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  email?: string;
  deviceId?: string;
  user?: {
    userId: string;
    email: string;
    deviceId?: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const userId = parseInt(decoded.userId, 10);
    if (isNaN(userId)) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.userId = userId;
    req.email = decoded.email;
    req.deviceId = decoded.deviceId;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      deviceId: decoded.deviceId,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
