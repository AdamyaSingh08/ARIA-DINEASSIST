import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RestaurantTable, Robot } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  LayoutGrid,
  Bot,
  Users,
  Battery,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  UtensilsCrossed,
  Bell,
  Cpu,
  ChevronRight,
  ShieldCheck,
  Radio
} from 'lucide-react';

export const TablesRobotsPage: React.FC = () => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Robot Registration Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [newRobotId, setNewRobotId] = useState<string>('');
  const [newRobotName, setNewRobotName] = useState<string>('');
  const [newRobotMode, setNewRobotMode] = useState<string>('physical');

  // Assign Robot Modal
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [assigningRobotId, setAssigningRobotId] = useState<string>('');

  const { socket } = useSocket();

  const loadData = async () => {
    try {
      setLoading(true);
      const [tablesData, robotsData] = await Promise.all([
        api.getTables(),
        api.getRobots()
      ]);
      setTables(tablesData);
      setRobots(robotsData);
    } catch (err: any) {
      console.error('Failed to load tables & robots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => loadData();
      socket.on('table.updated', handleUpdate);
      socket.on('robot.status', handleUpdate);
      socket.on('robot.heartbeat', handleUpdate);
      socket.on('robot.assigned', handleUpdate);
      socket.on('robot.registered', handleUpdate);
      socket.on('system.reset', handleUpdate);

      return () => {
        socket.off('table.updated', handleUpdate);
        socket.off('robot.status', handleUpdate);
        socket.off('robot.heartbeat', handleUpdate);
        socket.off('robot.assigned', handleUpdate);
        socket.off('robot.registered', handleUpdate);
        socket.off('system.reset', handleUpdate);
      };
    }
  }, [socket]);

  const handleAssignRobot = async (tableId: string, robotId: string | null) => {
    try {
      await api.assignRobot(tableId, robotId);
      setSelectedTable(null);
      loadData();
    } catch (err: any) {
      alert(`Could not assign robot: ${err.message}`);
    }
  };

  const handleToggleTableStatus = async (tableId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'occupied' : 'available';
    try {
      await api.updateTableStatus(tableId, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegisterRobot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRobotId.trim() || !newRobotName.trim()) return;
    try {
      await api.registerRobot({
        id: newRobotId.trim().toLowerCase(),
        name: newRobotName.trim(),
        mode: newRobotMode
      });
      setIsRegisterOpen(false);
      setNewRobotId('');
      setNewRobotName('');
      loadData();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const primaryRobot = robots[0];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderLine">
        <div>
          <h2 className="font-serif text-2xl font-normal text-charcoal tracking-tight">Tables & Robot Fleet</h2>
          <p className="text-xs text-muted mt-1 font-sans">
            Dining room layout, table occupancy, and ARIA autonomous rover fleet topology.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-borderLine text-xs font-medium text-charcoal hover:bg-forest-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-citrus" />
            <span>Register Rover</span>
          </button>
        </div>
      </div>

      {/* ARIA Active Hardware Spotlight Card */}
      {primaryRobot && (
        <div className="bg-white rounded-lg border border-borderLine p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-md bg-forest-800 text-citrus flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-normal text-charcoal">{primaryRobot.name}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-sage-100 text-forest-900 border border-sage-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest-700 animate-pulse" />
                    ONLINE
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-forest-50 text-muted border border-borderLine">
                    {primaryRobot.mode.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Assigned Table: <strong className="text-charcoal font-semibold">{primaryRobot.table_name || primaryRobot.assigned_table_id || 'Table 4 (T04)'}</strong> · Model: {primaryRobot.model || 'ARIA ESP32-S3 Autonomous Rover'}
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-6 text-xs border-t lg:border-t-0 pt-3 lg:pt-0 border-borderLine">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-mono">Battery</p>
                <div className="flex items-center gap-1.5 mt-0.5 font-mono font-bold text-charcoal">
                  <Battery className="w-3.5 h-3.5 text-forest-700" />
                  <span>{primaryRobot.battery_level}%</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-mono">Firmware</p>
                <p className="mt-0.5 font-mono text-charcoal">{primaryRobot.firmware_version || 'v2.4-aria'}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-mono">Last Signal</p>
                <p className="mt-0.5 font-mono text-charcoal">
                  {primaryRobot.last_seen ? new Date(primaryRobot.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                </p>
              </div>

              <div className="hidden sm:block">
                <span className="px-2.5 py-1 rounded bg-forest-50 border border-borderLine text-[11px] text-forest-900 font-mono">
                  1-to-1 Table Pair
                </span>
              </div>
            </div>
          </div>

          {/* Deployment Scalability Note */}
          <div className="mt-4 pt-3 border-t border-borderLine flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-700 shrink-0" />
              <span>
                <strong>System Architecture:</strong> Currently operating single hardware unit on Table 4. Future roadmap enables 1 dedicated ARIA rover per dining table.
              </span>
            </div>
            <span className="font-mono text-[11px] text-forest-800 font-medium">Ready for multi-rover pairing</span>
          </div>
        </div>
      )}

      {/* Dining Floor Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-forest-700" />
            <h3 className="font-serif text-base font-normal text-charcoal">Floor Plan & Table Sessions</h3>
          </div>
          <span className="text-xs font-mono text-muted">
            {tables.filter(t => t.status !== 'available').length} / {tables.length} tables active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {tables.map((t) => {
            const isBillReq = t.status === 'bill_requested';
            const isOccupied = t.status === 'occupied';
            const hasRobot = !!t.active_robot_id;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-lg border p-4 shadow-2xs flex flex-col justify-between transition-colors ${
                  isBillReq
                    ? 'border-terracotta/40 bg-amber-50/20'
                    : isOccupied
                    ? 'border-forest-700/30 bg-forest-50/30'
                    : 'border-borderLine bg-white'
                }`}
              >
                <div>
                  {/* Table Header */}
                  <div className="flex items-start justify-between pb-2.5 border-b border-borderLine">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-base font-normal text-charcoal">{t.name}</h4>
                        <span className="font-mono text-[11px] text-muted">[{t.id}]</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 font-sans">
                        <Users className="w-3 h-3 text-muted" />
                        <span>{t.capacity} covers</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-wide uppercase ${
                      isBillReq
                        ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                        : isOccupied
                        ? 'bg-forest-100 text-forest-900 border border-forest-200'
                        : 'bg-sage-100 text-forest-800 border border-sage-200'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* ARIA Hardware Station Info */}
                  <div className="py-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Table Rover:</span>
                      {hasRobot ? (
                        <div className="flex items-center gap-1.5 font-medium text-charcoal">
                          <Bot className="w-3.5 h-3.5 text-forest-700" />
                          <span>{t.robot_name || t.active_robot_id}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-forest-700" />
                        </div>
                      ) : (
                        <span className="text-muted/60 italic text-[11px]">Unassigned</span>
                      )}
                    </div>

                    {/* Operational Counts */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-borderLine text-xs">
                      <div className="flex items-center justify-between px-2 py-1.5 rounded bg-forest-50/60 border border-borderLine">
                        <span className="text-muted text-[11px]">Staff Calls</span>
                        <span className="font-mono font-bold text-charcoal">{t.pending_requests_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 rounded bg-forest-50/60 border border-borderLine">
                        <span className="text-muted text-[11px]">Active Orders</span>
                        <span className="font-mono font-bold text-charcoal">{t.active_orders_count || 0}</span>
                      </div>
                    </div>

                    {t.current_bill_amount && (
                      <div className="mt-2 p-2 rounded bg-sage-50 border border-sage-200 text-xs flex items-center justify-between">
                        <span className="text-forest-900 font-medium">Unsettled Total:</span>
                        <span className="font-mono font-bold text-forest-900">₹{t.current_bill_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table Management Actions */}
                <div className="pt-3 border-t border-borderLine flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTable(t);
                      setAssigningRobotId(t.active_robot_id || '');
                    }}
                    className="flex-1 py-1.5 rounded border border-borderLine text-xs font-medium text-charcoal hover:bg-forest-50 transition-colors"
                  >
                    {t.active_robot_id ? 'Change Rover' : 'Assign Rover'}
                  </button>
                  <button
                    onClick={() => handleToggleTableStatus(t.id, t.status)}
                    className="px-2.5 py-1.5 rounded border border-borderLine text-xs font-medium text-muted hover:text-charcoal hover:bg-forest-50 transition-colors"
                  >
                    {t.status === 'available' ? 'Mark Occupied' : 'Mark Available'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Robot Hardware Fleet Telemetry Table */}
      <div className="bg-white rounded-lg border border-borderLine shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-borderLine flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-forest-700" />
            <h3 className="font-serif text-base font-normal text-charcoal">ARIA Fleet Hardware Telemetry</h3>
          </div>
          <span className="text-xs font-mono text-muted">
            {robots.filter(r => r.status === 'online').length} of {robots.length} rovers online
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-forest-50/70 border-b border-borderLine text-muted font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-medium">Rover Identifier</th>
                <th className="py-2.5 px-4 font-medium">Assigned Table</th>
                <th className="py-2.5 px-4 font-medium">Connection</th>
                <th className="py-2.5 px-4 font-medium">Hardware Mode</th>
                <th className="py-2.5 px-4 font-medium">Battery</th>
                <th className="py-2.5 px-4 font-medium">Last Event</th>
                <th className="py-2.5 px-4 font-medium text-right">Firmware</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderLine font-sans">
              {robots.map((rob) => (
                <tr key={rob.id} className="hover:bg-forest-50/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-forest-800 text-citrus flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-medium text-charcoal">{rob.name}</span>
                        <p className="text-[10px] text-muted font-mono">{rob.id} · {rob.model}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-medium text-charcoal">
                    {rob.table_name || rob.assigned_table_id ? (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-forest-50 border border-borderLine text-forest-900">
                        {rob.table_name || rob.assigned_table_id}
                      </span>
                    ) : (
                      <span className="text-muted/60 italic text-[11px]">Unassigned</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-sage-100 text-forest-900 border border-sage-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-forest-700 animate-pulse" />
                      {rob.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-forest-50 text-charcoal border border-borderLine">
                      {rob.mode}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 font-mono text-charcoal">
                      <Battery className="w-3 h-3 text-forest-700" />
                      <span>{rob.battery_level}%</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-muted">
                    <div className="font-mono text-[11px] text-charcoal">
                      {rob.last_seen ? new Date(rob.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </div>
                    <div className="text-[10px] text-muted font-mono">{rob.last_event_type || 'No recent activity'}</div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-[11px] text-muted">
                    {rob.firmware_version}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Robot Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-5 border border-borderLine">
            <h3 className="font-serif text-lg font-normal text-charcoal mb-1">
              Station ARIA Rover
            </h3>
            <p className="text-xs text-muted mb-4">
              Select which robot unit handles table-side requests for <strong>{selectedTable.name}</strong>.
            </p>

            <div className="space-y-1.5 mb-4">
              <label className="text-xs text-charcoal font-medium">Available Rover:</label>
              <select
                value={assigningRobotId}
                onChange={(e) => setAssigningRobotId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
              >
                <option value="">-- Remove Stationing (Unassign) --</option>
                {robots.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.id}) — {r.status.toUpperCase()} [{r.mode}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-borderLine">
              <button
                onClick={() => setSelectedTable(null)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-charcoal hover:bg-forest-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignRobot(selectedTable.id, assigningRobotId || null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-forest-800 text-white hover:bg-forest-900 transition-colors"
              >
                Confirm Stationing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Robot Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 border border-borderLine">
            <h3 className="font-serif text-xl font-normal text-charcoal mb-1">Register New ARIA Rover</h3>
            <p className="text-xs text-muted mb-4">
              Add a new ESP32-S3 rover hardware node to the restaurant fleet telemetry network.
            </p>

            <form onSubmit={handleRegisterRobot} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Rover Hardware ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. aria-rover-02"
                  value={newRobotId}
                  onChange={(e) => setNewRobotId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-ivory border border-borderLine rounded-md font-mono text-charcoal focus:outline-hidden focus:border-forest-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARIA Rover 2"
                  value={newRobotName}
                  onChange={(e) => setNewRobotName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Integration Mode</label>
                <select
                  value={newRobotMode}
                  onChange={(e) => setNewRobotMode(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
                >
                  <option value="physical">Physical Hardware (ESP32-S3 ARIA Rover)</option>
                  <option value="demo">Virtual / Demo Simulator</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-borderLine">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-muted hover:text-charcoal hover:bg-forest-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-forest-800 text-white hover:bg-forest-900 transition-colors"
                >
                  Register Rover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
