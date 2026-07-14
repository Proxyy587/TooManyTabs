import { Router } from "express";
import type { Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { devices } from "../db/schema.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// GET /device — list devices for this account
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: devices.id,
        name: devices.name,
        platform: devices.platform,
        lastSeenAt: devices.lastSeenAt,
        createdAt: devices.createdAt,
      })
      .from(devices)
      .where(eq(devices.userId, req.userId!))
      .orderBy(desc(devices.lastSeenAt));

    res.json({ devices: rows, currentDeviceId: req.deviceId });
  } catch (error) {
    console.error("[device/list]", error);
    res.status(500).json({ message: "Failed to list devices" });
  }
});

// DELETE /device/:id — revoke a device
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deviceId = req.params.id;
    if (!deviceId) {
      return res.status(400).json({ message: "Device id is required" });
    }

    const [device] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.userId, req.userId!)))
      .limit(1);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    await db.delete(devices).where(eq(devices.id, device.id));
    res.json({ success: true });
  } catch (error) {
    console.error("[device/delete]", error);
    res.status(500).json({ message: "Failed to delete device" });
  }
});

export default router;
