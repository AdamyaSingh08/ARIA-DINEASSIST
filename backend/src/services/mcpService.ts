import { db } from '../db';
import { processRobotEvent } from './eventService';

/**
 * Model Context Protocol (MCP) Tool Definitions for ARIA DineAssist
 * Standard compliant with MCP Specification 2024-11-05
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export const ARIA_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'aria_create_service_request',
    description: 'Record a table-side customer service request originating from the physical ARIA robot (e.g. customer asking for water, calling waiter, or general assistance).',
    inputSchema: {
      type: 'object',
      properties: {
        table_id: {
          type: 'string',
          description: 'The dining table identifier where the robot is stationed (e.g., "T01", "T04").'
        },
        robot_id: {
          type: 'string',
          description: 'Unique identifier of the robot reporting this request (e.g., "robot-01", "aria-robot-01").'
        },
        request_type: {
          type: 'string',
          enum: ['water', 'waiter', 'bill', 'assistance', 'custom'],
          description: 'Classification of service required by the customer.'
        },
        message: {
          type: 'string',
          description: 'Optional additional verbal context or message spoken by the customer.'
        },
        event_id: {
          type: 'string',
          description: 'Unique idempotency key to prevent duplicate processing on retries.'
        }
      },
      required: ['table_id', 'robot_id', 'request_type']
    }
  },
  {
    name: 'aria_submit_food_order',
    description: 'Submit customer food order items from the table-side robot to the restaurant kitchen display system. Prices are authoritatively calculated by the backend.',
    inputSchema: {
      type: 'object',
      properties: {
        table_id: {
          type: 'string',
          description: 'The dining table identifier (e.g. "T04").'
        },
        robot_id: {
          type: 'string',
          description: 'Unique identifier of the robot taking the order.'
        },
        items: {
          type: 'array',
          description: 'Array of dishes and quantities ordered by the customer.',
          items: {
            type: 'object',
            properties: {
              menu_item_id: {
                type: 'string',
                description: 'Unique menu item ID (e.g. "item-001" for Paneer Tikka).'
              },
              quantity: {
                type: 'integer',
                minimum: 1,
                description: 'Quantity ordered.'
              },
              notes: {
                type: 'string',
                description: 'Optional preparation notes (e.g. "extra spicy", "less oil").'
              }
            },
            required: ['menu_item_id', 'quantity']
          }
        },
        special_instructions: {
          type: 'string',
          description: 'Optional overall chef instructions for this kitchen ticket.'
        },
        event_id: {
          type: 'string',
          description: 'Unique idempotency key.'
        }
      },
      required: ['table_id', 'robot_id', 'items']
    }
  },
  {
    name: 'aria_request_bill',
    description: 'Notify the restaurant staff and cashier that a customer at a specific table wants their bill / invoice.',
    inputSchema: {
      type: 'object',
      properties: {
        table_id: {
          type: 'string',
          description: 'The dining table identifier (e.g. "T04").'
        },
        robot_id: {
          type: 'string',
          description: 'Unique identifier of the robot transmitting the request.'
        },
        event_id: {
          type: 'string',
          description: 'Unique idempotency key.'
        }
      },
      required: ['table_id', 'robot_id']
    }
  },
  {
    name: 'aria_get_table_status',
    description: 'Provide the AI agent with a concise operational summary of a dining table (occupancy, active orders, pending requests, and current unsettled bill amount).',
    inputSchema: {
      type: 'object',
      properties: {
        table_id: {
          type: 'string',
          description: 'The dining table identifier (e.g. "T04").'
        }
      },
      required: ['table_id']
    }
  }
];

/**
 * Handle MCP JSON-RPC 2.0 requests
 */
export async function handleMcpJsonRpc(body: any): Promise<any> {
  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' }
    };
  }

  switch (method) {
    case 'initialize': {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          serverInfo: {
            name: 'aria-dineassist-mcp-server',
            version: '2.0.0'
          }
        }
      };
    }

    case 'notifications/initialized': {
      // Notification acknowledgment (no response needed in JSON-RPC specification, or null)
      return null;
    }

    case 'ping': {
      return {
        jsonrpc: '2.0',
        id,
        result: {}
      };
    }

    case 'tools/list': {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: ARIA_MCP_TOOLS
        }
      };
    }

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const toolResult = await executeMcpTool(toolName, toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
              }
            ],
            isError: false
          }
        };
      } catch (err: any) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error executing ${toolName}: ${err.message}`
              }
            ],
            isError: true
          }
        };
      }
    }

    default: {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: '${method}'`
        }
      };
    }
  }
}

/**
 * Execute an individual MCP tool call securely against the existing business engine
 */
export async function executeMcpTool(name: string, args: any): Promise<any> {
  const eventId = args.event_id || `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  switch (name) {
    case 'aria_create_service_request': {
      const { table_id, robot_id, request_type, message } = args;
      if (!table_id || !robot_id || !request_type) {
        throw new Error('Missing required arguments: table_id, robot_id, request_type');
      }

      const res = processRobotEvent(
        {
          event_id: eventId,
          robot_id,
          table_id,
          type: 'service_request',
          request_type,
          message: message || `Customer requested ${request_type} via ARIA robot`
        },
        'mcp_tool_call'
      );

      return {
        status: 'success',
        message: `Service request for ${request_type} at ${table_id} recorded successfully.`,
        request_id: res.data?.id,
        event_id: eventId
      };
    }

    case 'aria_submit_food_order': {
      const { table_id, robot_id, items, special_instructions } = args;
      if (!table_id || !robot_id || !items || !Array.isArray(items)) {
        throw new Error('Missing required arguments: table_id, robot_id, items');
      }

      const res = processRobotEvent(
        {
          event_id: eventId,
          robot_id,
          table_id,
          type: 'food_order_submitted',
          items,
          special_instructions
        },
        'mcp_tool_call'
      );

      return {
        status: 'success',
        order_id: res.data?.id,
        table_id,
        subtotal: res.data?.subtotal,
        message: `Food order confirmed for ${table_id}. Kitchen ticket dispatched. Total ₹${res.data?.subtotal}.`,
        event_id: eventId
      };
    }

    case 'aria_request_bill': {
      const { table_id, robot_id } = args;
      if (!table_id || !robot_id) {
        throw new Error('Missing required arguments: table_id, robot_id');
      }

      const res = processRobotEvent(
        {
          event_id: eventId,
          robot_id,
          table_id,
          type: 'bill_requested'
        },
        'mcp_tool_call'
      );

      return {
        status: 'success',
        table_id,
        message: `Bill request registered for ${table_id}. Staff notified for payment collection.`,
        bill: res.data?.bill || null,
        event_id: eventId
      };
    }

    case 'aria_get_table_status': {
      const { table_id } = args;
      if (!table_id) throw new Error('Missing required argument: table_id');

      const table = db.prepare('SELECT * FROM restaurant_tables WHERE id = ?').get(table_id) as any;
      if (!table) {
        return { error: `Table '${table_id}' not found.` };
      }

      const pendingRequests = db.prepare(`
        SELECT id, request_type, message, status, created_at 
        FROM service_requests 
        WHERE table_id = ? AND status IN ('New', 'Acknowledged', 'In Progress')
      `).all(table_id);

      const activeOrders = db.prepare(`
        SELECT id, status, subtotal, created_at 
        FROM food_orders 
        WHERE table_id = ? AND status IN ('Received', 'Confirmed', 'Preparing', 'Ready')
      `).all(table_id);

      const openBill = db.prepare(`
        SELECT invoice_number, subtotal, tax_amount, final_amount, status 
        FROM bills 
        WHERE table_id = ? AND status = 'Open' 
        ORDER BY created_at DESC LIMIT 1
      `).get(table_id);

      return {
        table_id: table.id,
        table_name: table.name,
        capacity: table.capacity,
        occupancy_status: table.status,
        active_robot_id: table.active_robot_id,
        pending_requests: pendingRequests,
        active_orders: activeOrders,
        open_bill: openBill || null
      };
    }

    default:
      throw new Error(`Unknown MCP tool: '${name}'`);
  }
}
