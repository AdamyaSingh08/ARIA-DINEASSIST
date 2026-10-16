import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

export function verifyRobotApiKey(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers['authorization'];
  let bearerKey: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerKey = authHeader.substring(7).trim();
  }

  const providedKey = headerKey || bearerKey;

  // Retrieve authorized key from database or environment
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'robot_api_key'").get() as { value: string } | undefined;
  const validKey = row ? row.value : (process.env.ROBOT_API_KEY || 'xiaozhi_secret_key_innotech2026');

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing Robot API Key in headers (Use X-API-Key or Authorization: Bearer <key>)'
    });
  }

  if (providedKey !== validKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Robot API Key provided'
    });
  }

  next();
}
