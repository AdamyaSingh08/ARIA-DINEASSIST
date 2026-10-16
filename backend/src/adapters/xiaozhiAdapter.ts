import { logActivity } from '../db';

/**
 * XiaoZhi (Xhaizi) Integration Adapter
 * 
 * Technical Architecture Overview:
 * - XiaoZhi hardware (typically ESP32-S3 with I2S audio codec + Wi-Fi) connects to an AI backend 
 *   using WebSockets/UDP for low-latency voice streaming.
 * - Restaurant business events (service requests, food orders, bill requests) are extracted 
 *   when the AI assistant invokes custom Tool/Function calls (or when the XiaoZhi firmware executes 
 *   an intent recognition webhook).
 * - This adapter defines the bridge contracts:
 *   1. Inbound REST Event Receiver: Receives normalized JSON payloads at /api/integrations/robot/events.
 *   2. Outbound Robot Acknowledger: Sends status updates back to the robot (TTS confirmation, LED indicators).
 *   3. MQTT Bridge Stub: Optional decoupled broker bridge for distributed setups.
 */

export interface RobotOutboundMessage {
  robot_id: string;
  table_id: string;
  event_type: 'acknowledgement' | 'tts_speak' | 'display_message';
  message: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface XiaoZhiAdapterConfig {
  enabled: boolean;
  robotWebhookBaseUrl?: string; // e.g. http://192.168.1.105:8080/api/robot/notify
  mqttBrokerUrl?: string;       // Optional: mqtt://192.168.1.50:1883
  apiKey: string;
}

class XiaoZhiAdapter {
  private config: XiaoZhiAdapterConfig = {
    enabled: true,
    apiKey: process.env.ROBOT_API_KEY || 'xiaozhi_secret_key_innotech2026'
  };

  public setConfig(newConfig: Partial<XiaoZhiAdapterConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): XiaoZhiAdapterConfig {
    return this.config;
  }

  /**
   * Send staff acknowledgement or notification back to the physical robot.
   * If the robot is in Demo mode or physical webhook is unreachable, this gracefully logs and succeeds.
   */
  public async sendOutboundAcknowledgement(outbound: RobotOutboundMessage): Promise<{ success: boolean; message: string }> {
    console.log(`[XiaoZhi Adapter] Outbound acknowledgement queued for ${outbound.robot_id}: "${outbound.message}"`);

    // In a fully deployed hardware setup with XiaoZhi firmware supporting an HTTP endpoint or MQTT topic:
    if (this.config.robotWebhookBaseUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${this.config.robotWebhookBaseUrl}/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey
          },
          body: JSON.stringify(outbound),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          logActivity('robot', 'Robot Outbound Sent', `Sent TTS payload to physical robot ${outbound.robot_id}: "${outbound.message}"`, outbound.table_id, outbound.robot_id, 'info');
          return { success: true, message: 'Delivered to physical robot' };
        }
      } catch (err: any) {
        console.warn(`[XiaoZhi Adapter] Could not reach physical robot webhook at ${this.config.robotWebhookBaseUrl}:`, err.message);
      }
    }

    // Default simulation / bridge log
    return {
      success: true,
      message: `Outbound acknowledgement processed for ${outbound.robot_id} (virtual delivery)`
    };
  }
}

export const xiaozhiAdapter = new XiaoZhiAdapter();
