import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { db } from "./db/index.js";
import { users, sessions, tabs } from "./db/schema.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authMiddleware, type AuthenticatedRequest } from "./middleware/auth.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "This is the TooManyTabs Api Server" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "configured" : "not configured",
    jwt: process.env.JWT_SECRET ? "configured" : "not configured",
    google: process.env.GOOGLE_CLIENT_ID ? "configured" : "not configured",
  });
});

app.post("/auth/google", async (req, res) => {
  try {
    let email: string;
    let sub: string;
    let name: string | undefined;
    let picture: string | undefined;

    const { accessToken } = req.body;

    if (accessToken) {
      try {
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
        );

        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text().catch(() => '');
          console.error('Google API error:', userInfoResponse.status, errorText);
          return res.status(401).json({ message: "Invalid access token" });
        }

        const userInfo = await userInfoResponse.json();
        console.log('Google user info received:', { id: userInfo.id, email: userInfo.email });
        
        sub = userInfo.id;
        email = userInfo.email;
        name = userInfo.name;
        picture = userInfo.picture;
      } catch (error) {
        console.error('Error verifying access token:', error);
        return res.status(401).json({ message: "Failed to verify access token" });
      }
    } else {
      const { email: reqEmail, sub: reqSub, name: reqName, picture: reqPicture } = req.body;
      email = reqEmail;
      sub = reqSub;
      name = reqName;
      picture = reqPicture;
    }

    if (!sub || !email) {
      return res.status(400).json({ message: "User ID and email are required" });
    }

    console.log('Looking up user in database with Google ID:', sub);
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.googleId, sub))
      .limit(1);
    
    console.log('Existing user found:', existingUser.length > 0);

    let user;
    if (existingUser.length === 0) {
      const newUser = await db
        .insert(users)
        .values({
          googleId: sub,
          email,
          name: name || null,
          picture: picture || null,
        })
        .returning();
      user = newUser[0];
    } else {
      const updatedUser = await db
        .update(users)
        .set({
          name: name || existingUser[0]?.name || null,
          picture: picture || existingUser[0]?.picture || null,
          updatedAt: new Date(),
        })
        .where(eq(users.googleId, sub))
        .returning();
      const updated = updatedUser[0];
      if (!updated) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      user = updated;
    }

    if (!user) {
      return res.status(500).json({ message: "Failed to create or update user" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret not configured" });
    }

    const token = jwt.sign(
      { userId: String(user.id), email: user.email, googleId: sub },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        picture: user.picture || undefined,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    const errorMessage = error instanceof Error ? error.message : "error";
    res.status(500).json({ 
      message: "Authentication failed",
      error: errorMessage 
    });
  }
});

app.post("/api/tabs/save", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tabs: tabsData, groupLabel } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!tabsData || !Array.isArray(tabsData) || tabsData.length === 0) {
      return res.status(400).json({ message: "Tabs array is required" });
    }

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const newSessions = await db
      .insert(sessions)
      .values({
        userId: userIdNum,
        groupLabel: groupLabel || null,
      })
      .returning();

    const newSession = newSessions[0];
    if (!newSession) {
      return res.status(500).json({ message: "Failed to create session" });
    }

    const sessionId = newSession.id;

    const tabsToInsert = tabsData.map((tab: { url: string; title: string; favIconUrl?: string }) => ({
      sessionId: sessionId,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl || null,
    }));

    await db.insert(tabs).values(tabsToInsert);

    res.json({
      success: true,
      sessionId: sessionId,
      message: "Tabs saved successfully",
    });
  } catch (error) {
    console.error("Save tabs error:", error);
    res.status(500).json({ message: "Failed to save tabs" });
  }
});

app.get("/api/tabs/sessions", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userIdNum))
      .orderBy(desc(sessions.createdAt));

    const sessionIds = userSessions.map((s) => s.id);
    const allTabs = sessionIds.length > 0
      ? await db.select().from(tabs).where(inArray(tabs.sessionId, sessionIds))
      : [];

    const tabsBySession = new Map<number, typeof allTabs>();
    allTabs.forEach((tab) => {
      const existing = tabsBySession.get(tab.sessionId) || [];
      existing.push(tab);
      tabsBySession.set(tab.sessionId, existing);
    });

    const sessionsWithTabs = userSessions.map((session) => {
      const sessionTabs = tabsBySession.get(session.id) || [];
      return {
        id: `session-${session.id}`,
        timestamp: session.createdAt.getTime(),
        groupLabel: session.groupLabel || undefined,
        tabs: sessionTabs.map((tab) => ({
          id: String(tab.id),
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl || undefined,
          timestamp: tab.createdAt.getTime(),
        })),
      };
    });

    res.json({
      success: true,
      sessions: sessionsWithTabs,
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

app.delete("/api/tabs/sessions/:sessionId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId || !sessionId) {
      return res.status(400).json({ message: "Session ID and user ID are required" });
    }

    const userIdNum = parseInt(userId, 10);
    const sessionIdNum = parseInt(sessionId, 10);

    if (isNaN(userIdNum) || isNaN(sessionIdNum)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    await db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionIdNum), eq(sessions.userId, userIdNum)));

    res.json({ success: true, message: "Session deleted successfully" });
  } catch (error) {
    console.error("Delete session error:", error);
    res.status(500).json({ message: "Failed to delete session" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Health check: http://localhost:" + PORT + "/health");
  
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set");
  }
  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not set");
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn("GOOGLE_CLIENT_ID is not set");
  }
});
