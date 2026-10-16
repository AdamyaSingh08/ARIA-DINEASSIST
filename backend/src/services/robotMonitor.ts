import { db, logActivity } from '../db';
import { broadcastEvent } from '../sockets';

let monitorInterval: NodeJS.Timeout | null = null;

export function startRobotHeartbeatMonitor(intervalMs = 15000) {
  if (monitorInterval) clearInterval(monitorInterval);

  monitorInterval = setInterval(() => {
    try {
      const row = db.prepare("SELECT value FROM app_settings WHERE key = 'heartbeat_timeout_seconds'").get() as { value: string } | undefined;
      const timeoutSeconds = row ? parseInt(row.value, 10) : 90;

      const cutoffTime = new Date(Date.now() - timeoutSeconds * 1000).toISOString();

      // Find robots that are marked 'online' but haven't sent a heartbeat/event since cutoff
      const staleRobots = db.prepare(`
        SELECT * FROM robots 
        WHERE status = 'online' AND (last_seen IS NULL OR last_seen < ?)
      `).all(cutoffTime) as any[];

      for (const robot of staleRobots) {
        const now = new Date().toISOString();
        db.prepare("UPDATE robots SET status = 'offline', updated_at = ? WHERE id = ?").run(now, robot.id);

        logActivity('robot', 'Robot Offline', `Robot ${robot.name} (${robot.id}) timed out after ${timeoutSeconds}s of silence.`, robot.assigned_table_id, robot.id, 'warning');

        broadcastEvent('robot.status', {
          id: robot.id,
          name: robot.name,
          status: 'offline',
          last_seen: robot.last_seen,
          updated_at: now
        });
      }
    } catch (err: any) {
      console.error('[RobotMonitor] Error during heartbeat sweep:', err.message);
    }
  }, intervalMs);

  console.log(`[RobotMonitor] Started robot heartbeat monitor (sweep interval: ${intervalMs}ms)`);
}

export function stopRobotHeartbeatMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
