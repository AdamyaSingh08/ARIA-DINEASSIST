import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RestaurantTable, Robot } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  LayoutGrid,
  Bot,
  Users,
  Battery,
  Radio,
  Sparkles,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Receipt,
  UtensilsCrossed,
  Bell
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

  // Handle Robot Assignment
  const handleAssignRobot = async (tableId: string, robotId: string | null) => {
    try {
      await api.assignRobot(tableId, robotId);
      setSelectedTable(null);
      loadData();
    } catch (err: any) {
      alert(`Could not assign robot: ${err.message}`);
    }
  };

  // Handle Table Status Toggle
  const handleToggleTableStatus = async (tableId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'occupied' : 'available';
    try {
      await api.updateTableStatus(tableId, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Register Robot
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

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">Tables & Robot Fleet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical restaurant layout, table sessions, and XiaoZhi rover fleet health.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Robot</span>
        </button>
      </div>

      {/* SECTION 1: Restaurant Floor Tables */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Dining Floor Layout</h3>
          </div>
          <span className="text-xs text-slate-500">
            {tables.filter(t => t.status !== 'available').length} / {tables.length} tables active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((t) => {
            const isBillReq = t.status === 'bill_requested';
            const isOccupied = t.status === 'occupied';

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl p-5 border shadow-2xs flex flex-col justify-between transition ${
                  isBillReq ? 'border-amber-400 ring-1 ring-amber-200 bg-amber-50/15' :
                  isOccupied ? 'border-blue-200 bg-blue-50/10' :
                  'border-slate-200 bg-white'
                }`}
              >
                <div>
                  {/* Table Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-sm text-navy-900">{t.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          {t.capacity} Seats
                        </span>
                        <span>·</span>
                        <span className="font-mono">{t.id}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isBillReq ? 'bg-amber-100 text-amber-800' :
                      isOccupied ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Robot Assignment Info */}
                  <div className="py-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Assigned Robot:</span>
                      {t.active_robot_id ? (
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Bot className="w-3.5 h-3.5 text-teal-600" />
                          <span>{t.robot_name || t.active_robot_id}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            t.robot_status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`} />
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </div>

                    {/* Table metrics */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Bell className="w-3.5 h-3.5 text-rose-500" />
                        <span>Calls: <strong>{t.pending_requests_count || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-blue-500" />
                        <span>Orders: <strong>{t.active_orders_count || 0}</strong></span>
                      </div>
                    </div>

                    {t.current_bill_amount && (
                      <div className="mt-2.5 p-2 rounded-lg bg-teal-50/70 border border-teal-200 text-xs flex items-center justify-between">
                        <span className="text-teal-900 font-medium">Unpaid Bill:</span>
                        <span className="font-bold text-teal-800">₹{t.current_bill_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTable(t);
                      setAssigningRobotId(t.active_robot_id || '');
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    {t.active_robot_id ? 'Change Robot' : 'Assign Robot'}
                  </button>
                  <button
                    onClick={() => handleToggleTableStatus(t.id, t.status)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t.status === 'available' ? 'Mark Occupied' : 'Mark Available'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Robot Hardware Fleet */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">XiaoZhi Robot Fleet Telemetry</h3>
          </div>
          <span className="text-xs text-slate-500">
            {robots.filter(r => r.status === 'online').length} of {robots.length} rovers online
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">ROBOT / MODEL</th>
                <th className="py-3 px-4">ASSIGNED TABLE</th>
                <th className="py-3 px-4">CONNECTIVITY</th>
                <th className="py-3 px-4">MODE</th>
                <th className="py-3 px-4">BATTERY</th>
                <th className="py-3 px-4">LAST TELEMETRY</th>
                <th className="py-3 px-4 text-right">FIRMWARE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {robots.map((rob) => (
                <tr key={rob.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">{rob.name}</span>
                        <p className="text-[10px] text-slate-400 font-mono">{rob.id} · {rob.model}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {rob.table_name || rob.assigned_table_id ? (
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {rob.table_name || rob.assigned_table_id}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rob.status === 'online'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        rob.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`} />
                      {rob.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      rob.mode === 'physical'
                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {rob.mode.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Battery className="w-3.5 h-3.5 text-teal-600" />
                      <span>{rob.battery_level}%</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    <div>{rob.last_seen ? new Date(rob.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}</div>
                    <div className="text-[10px] text-slate-400">{rob.last_event_type || 'None'}</div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
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
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3">
              Assign Robot to {selectedTable.name}
            </h3>

            <div className="space-y-2 mb-4">
              <label className="text-xs text-slate-600 font-medium">Select Robot:</label>
              <select
                value={assigningRobotId}
                onChange={(e) => setAssigningRobotId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="">-- No Robot (Unassign) --</option>
                {robots.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.id}) — {r.status.toUpperCase()} [{r.mode}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedTable(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignRobot(selectedTable.id, assigningRobotId || null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Robot Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-4">Register New Robot Rover</h3>

            <form onSubmit={handleRegisterRobot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Robot ID (unique identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. robot-05"
                  value={newRobotId}
                  onChange={(e) => setNewRobotId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. XiaoZhi Rover 5"
                  value={newRobotName}
                  onChange={(e) => setNewRobotName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Integration Mode</label>
                <select
                  value={newRobotMode}
                  onChange={(e) => setNewRobotMode(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="physical">Physical Hardware (ESP32-S3 XiaoZhi)</option>
                  <option value="demo">Virtual / Demo Simulator</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
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
