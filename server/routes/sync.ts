import { Router } from "express";
import type { Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { tabGroups, tabs } from "../db/schema.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

type TabInput = {
  url: string;
  title: string;
  favIconUrl?: string | null;
  position?: number;
};

type GroupInput = {
  id?: string;
  name: string;
  pinned?: boolean;
  deleted?: boolean;
  updatedAt?: string;
  /** server version the client's copy was based on; null/absent for new groups */
  baseVersion?: number | null;
  tabs?: TabInput[];
};

function serializeGroup(group: {
  id: string;
  name: string;
  pinned: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  tabs: {
    url: string;
    title: string;
    favIconUrl: string | null;
    position: number;
  }[];
}) {
  return {
    id: group.id,
    name: group.name,
    pinned: group.pinned,
    version: group.version,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    deleted: group.deletedAt !== null,
    tabs: group.tabs
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((t) => ({
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl,
        position: t.position,
      })),
  };
}

async function loadGroupWithTabs(groupId: string) {
  const [group] = await db
    .select()
    .from(tabGroups)
    .where(eq(tabGroups.id, groupId))
    .limit(1);

  if (!group) return null;

  const groupTabs = await db
    .select()
    .from(tabs)
    .where(eq(tabs.tabGroupId, groupId));

  return { ...group, tabs: groupTabs };
}

// GET /sync/pull?since=<ISO>
router.get("/pull", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sinceRaw =
      typeof req.query.since === "string" ? req.query.since : undefined;
    const since = sinceRaw ? new Date(sinceRaw) : new Date(0);

    if (isNaN(since.getTime())) {
      return res.status(400).json({ message: "Invalid 'since' timestamp" });
    }

    const groups = await db
      .select()
      .from(tabGroups)
      .where(
        and(eq(tabGroups.userId, req.userId!), gt(tabGroups.updatedAt, since))
      );

    const result = [];
    for (const group of groups) {
      const groupTabs = await db
        .select()
        .from(tabs)
        .where(eq(tabs.tabGroupId, group.id));
      result.push(serializeGroup({ ...group, tabs: groupTabs }));
    }

    res.json({
      serverTime: new Date().toISOString(),
      groups: result,
    });
  } catch (error) {
    console.error("[sync/pull]", error);
    res.status(500).json({ message: "Failed to pull sync data" });
  }
});

// POST /sync/push — last-write-wins upsert
router.post("/push", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incomingGroups = (req.body?.groups || []) as GroupInput[];

    if (!Array.isArray(incomingGroups) || incomingGroups.length === 0) {
      return res.status(400).json({ message: "groups array is required" });
    }

    if (incomingGroups.length > 500) {
      return res.status(400).json({ message: "Too many groups in one push" });
    }

    const accepted: string[] = [];
    const conflicts: ReturnType<typeof serializeGroup>[] = [];
    const created: { clientId?: string; serverId: string }[] = [];
    const versions: Record<string, number> = {};

    for (const incoming of incomingGroups) {
      if (!incoming.name || typeof incoming.name !== "string") {
        continue;
      }

      const existing = incoming.id
        ? await loadGroupWithTabs(incoming.id)
        : null;

      if (existing && existing.userId !== req.userId) {
        continue;
      }

      // Optimistic concurrency on the server-owned version number. Clients
      // that don't send baseVersion (older builds) fall back to timestamps.
      if (existing) {
        const base = typeof incoming.baseVersion === "number" ? incoming.baseVersion : null;
        const stale =
          base !== null
            ? existing.version > base
            : existing.updatedAt > (incoming.updatedAt ? new Date(incoming.updatedAt) : new Date());
        if (stale) {
          conflicts.push(serializeGroup(existing));
          continue;
        }
      }

      if (incoming.deleted) {
        if (existing) {
          await db
            .update(tabGroups)
            .set({
              deletedAt: new Date(),
              updatedAt: new Date(),
              version: existing.version + 1,
              originDevice: req.deviceId || existing.originDevice,
            })
            .where(eq(tabGroups.id, existing.id));
          versions[existing.id] = existing.version + 1;
        }
        // Accept even when the server never saw the group, so the client can drop its tombstone.
        if (incoming.id) accepted.push(incoming.id);
        continue;
      }

      const tabRows = (incoming.tabs || []).map((t, i) => ({
        url: t.url,
        title: (t.title || "Untitled").slice(0, 500),
        favIconUrl: t.favIconUrl || null,
        position: typeof t.position === "number" ? t.position : i,
      }));

      if (existing) {
        await db.delete(tabs).where(eq(tabs.tabGroupId, existing.id));
        await db
          .update(tabGroups)
          .set({
            name: incoming.name.slice(0, 200),
            pinned: !!incoming.pinned,
            deletedAt: null,
            updatedAt: new Date(),
            version: existing.version + 1,
            originDevice: req.deviceId || existing.originDevice,
          })
          .where(eq(tabGroups.id, existing.id));

        if (tabRows.length > 0) {
          await db.insert(tabs).values(
            tabRows.map((t) => ({
              tabGroupId: existing.id,
              ...t,
            }))
          );
        }

        accepted.push(existing.id);
        versions[existing.id] = existing.version + 1;
      } else {
        const insertValues: {
          id?: string;
          userId: number;
          name: string;
          pinned: boolean;
          originDevice?: string;
          updatedAt: Date;
        } = {
          userId: req.userId!,
          name: incoming.name.slice(0, 200),
          pinned: !!incoming.pinned,
          originDevice: req.deviceId,
          updatedAt: new Date(),
        };

        if (incoming.id) {
          insertValues.id = incoming.id;
        }

        const [createdGroup] = await db
          .insert(tabGroups)
          .values(insertValues)
          .returning();

        if (!createdGroup) continue;

        if (tabRows.length > 0) {
          await db.insert(tabs).values(
            tabRows.map((t) => ({
              tabGroupId: createdGroup.id,
              ...t,
            }))
          );
        }

        accepted.push(createdGroup.id);
        versions[createdGroup.id] = createdGroup.version;
        if (incoming.id && incoming.id !== createdGroup.id) {
          created.push({ clientId: incoming.id, serverId: createdGroup.id });
        }
      }
    }

    res.json({
      serverTime: new Date().toISOString(),
      accepted,
      conflicts,
      created,
      versions,
    });
  } catch (error) {
    console.error("[sync/push]", error);
    res.status(500).json({ message: "Failed to push sync data" });
  }
});

export default router;
