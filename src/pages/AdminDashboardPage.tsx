import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, MapPin, Plus, Shield, Trash2, Users } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types/campusfind';

export const AdminDashboardPage: React.FC = () => {
  const {
    users,
    rawItemsForPrivileged,
    claims,
    moderationReports,
    auditLogs,
    categories,
    locations,
    mapConfig,
    reviewClaim,
    updateModerationStatus,
    addCategory,
    removeCategory,
    addLocation,
    updateLocation,
    deleteLocation,
    updateUserRole,
    closeItemReport,
  } = useApp();

  const [tab, setTab] = useState<'overview' | 'students' | 'reports' | 'moderation' | 'config' | 'logs'>('overview');
  const [newCat, setNewCat] = useState('');
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locZone, setLocZone] = useState('');
  const [locDesk, setLocDesk] = useState(false);

  const stats = useMemo(() => {
    const students = users.filter((u) => u.role === 'student').length;
    const lost = rawItemsForPrivileged.filter((i) => i.type === 'lost').length;
    const found = rawItemsForPrivileged.filter((i) => i.type === 'found').length;
    const returned = rawItemsForPrivileged.filter((i) => i.status === 'Returned').length;
    const pendingClaims = claims.filter((c) => c.verificationStatus === 'Pending' || c.verificationStatus === 'Disputed').length;
    const suspicious = moderationReports.filter((m) => m.status === 'Open' || m.status === 'Under Review').length;
    const total = lost + found;
    const recoveryRate = total > 0 ? Math.round((returned / total) * 100) : 0;
    return { students, lost, found, returned, pendingClaims, suspicious, recoveryRate };
  }, [users, rawItemsForPrivileged, claims, moderationReports]);

  return (
    <AppShell
      title="Admin Management Console"
      subtitle="Platform oversight, dispute resolution, moderation, categories, and audit logs"
    >
      {/* Top Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Students</p>
          <p className="text-xl font-mono-num font-bold text-[#10243B] mt-1">{stats.students}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Lost Reports</p>
          <p className="text-xl font-mono-num font-bold text-amber-700 mt-1">{stats.lost}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Found Reports</p>
          <p className="text-xl font-mono-num font-bold text-[#1769AA] mt-1">{stats.found}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Returned</p>
          <p className="text-xl font-mono-num font-bold text-[#16A36A] mt-1">{stats.returned}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Claims</p>
          <p className="text-xl font-mono-num font-bold text-[#10243B] mt-1">{stats.pendingClaims}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Moderation</p>
          <p className="text-xl font-mono-num font-bold text-red-700 mt-1">{stats.suspicious}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Recovery Rate</p>
          <p className="text-xl font-mono-num font-bold text-[#16A36A] mt-1">{stats.recoveryRate}%</p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {[
            { id: 'overview', label: 'Claims & Disputes' },
            { id: 'students', label: 'Students & Roles' },
            { id: 'reports', label: 'All Reports' },
            { id: 'moderation', label: 'Moderation' },
            { id: 'config', label: 'Categories & Map' },
            { id: 'logs', label: 'Audit Logs' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === t.id ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/campus-map"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#10243B] border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <MapPin className="w-3.5 h-3.5 text-[#1769AA]" />
            <span>Visual Map Editor</span>
          </Link>
          <Link
            to="/analytics"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1769AA] border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Full Analytics</span>
          </Link>
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#10243B]">Pending Claims & Dispute Resolution</h2>
          </div>
          {claims.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No claims recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {claims.map((c) => {
                const item = rawItemsForPrivileged.find((i) => i.itemId === c.itemId);
                return (
                  <div key={c.claimId} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">
                        Claim {c.claimId} · Status: <strong className="text-[#10243B]">{c.verificationStatus}</strong>
                      </p>
                      <p className="text-sm font-bold text-[#10243B]">
                        {item?.title || c.itemId} — Claimant: {c.claimantName || c.claimantId}
                      </p>
                      <p className="text-xs text-slate-600">
                        Attempted Private Proof: {c.privateDetailAttempt}
                      </p>
                      {item?.privateFeatures && (
                        <p className="text-xs text-[#1769AA]">
                          Ground Truth: {item.privateFeatures}
                        </p>
                      )}
                    </div>
                    {c.verificationStatus !== 'Completed' && c.verificationStatus !== 'Rejected' && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => reviewClaim(c.claimId, 'Admin Approved', 'Approved by Admin')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1769AA] rounded-lg"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewClaim(c.claimId, 'Completed', 'Resolved & returned by Admin')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#16A36A] rounded-lg"
                        >
                          Complete Return
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewClaim(c.claimId, 'Rejected', 'Verification mismatch')}
                          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'students' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1769AA]" />
            <h2 className="text-base font-bold text-[#10243B]">Campus Directory & Role Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Returns</th>
                  <th className="py-3 px-6 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td className="py-3 px-6 font-semibold text-[#10243B]">{u.name}</td>
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-600">{u.studentId || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{u.department}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        aria-label={`Role for ${u.name}`}
                        onChange={(e) => updateUserRole(u.userId, e.target.value as UserRole)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="student">student</option>
                        <option value="security">security</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num">{u.successfulReturns}</td>
                    <td className="py-3 px-6 text-right font-mono-num font-bold text-[#16A36A]">{u.totalXP}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#10243B]">All Lost & Found Reports</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawItemsForPrivileged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-sm text-slate-500">
                      No lost or found reports submitted yet.
                    </td>
                  </tr>
                ) : (
                  rawItemsForPrivileged.map((it) => (
                    <tr key={it.itemId}>
                      <td className="py-3 px-6 font-semibold text-[#10243B]">{it.title}</td>
                      <td className="py-3 px-4 uppercase text-xs font-semibold text-slate-600">{it.type}</td>
                      <td className="py-3 px-4 text-slate-600">{it.location}</td>
                      <td className="py-3 px-4 text-slate-600">{it.reporterDisplay}</td>
                      <td className="py-3 px-4 font-semibold text-[#1769AA]">{it.status}</td>
                      <td className="py-3 px-6 text-right">
                        {it.status !== 'Closed' && (
                          <button
                            type="button"
                            onClick={() => closeItemReport(it.itemId)}
                            className="text-xs font-semibold text-slate-600 hover:text-red-700"
                          >
                            Close Report
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'moderation' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="px-6 py-4">
            <h2 className="text-base font-bold text-[#10243B]">Suspicious Reports & Moderation Queue</h2>
          </div>
          {moderationReports.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No moderation flags open.</div>
          ) : (
            moderationReports.map((rep) => (
              <div key={rep.reportId} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Case {rep.reportId} · Status: <strong>{rep.status}</strong>
                  </p>
                  <p className="text-sm font-semibold text-[#10243B] mt-1">{rep.reason}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target Item: {rep.targetItemId || '—'} · {new Date(rep.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateModerationStatus(rep.reportId, 'Resolved')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#16A36A] rounded-lg"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateModerationStatus(rep.reportId, 'Dismissed')}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#10243B]">Item Categories</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="Add new category..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  addCategory(newCat);
                  setNewCat('');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {categories.map((c) => (
                <div key={c} className="py-2 flex items-center justify-between text-sm">
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(c)}
                    aria-label={`Remove ${c}`}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#16A36A]" />
                <span>Campus Map & Locations</span>
              </h2>
              <Link
                to="/campus-map"
                className="text-xs font-semibold text-[#1769AA] hover:underline"
              >
                Open Visual Map Editor
              </Link>
            </div>

            <div className="p-3 rounded-lg bg-[#F6F8FB] border border-slate-200 text-xs flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-[#10243B]">{mapConfig.campusName}</p>
                <p className="text-slate-500">Layout: {mapConfig.layoutStyle}</p>
              </div>
              <span className="font-mono-num font-bold text-[#1769AA]">{locations.length} pins</span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!locName.trim() || !locCode.trim()) return;
                await addLocation({
                  name: locName,
                  buildingCode: locCode,
                  zone: locZone || 'Campus Zone',
                  latitude: 37.4275,
                  longitude: -122.1697,
                  mapX: 50,
                  mapY: 50,
                  hasSecurityDesk: locDesk,
                  securityHours: locDesk ? '08:00 - 20:00' : '',
                });
                setLocName('');
                setLocCode('');
                setLocZone('');
                setLocDesk(false);
              }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2"
            >
              <input
                type="text"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="Building name..."
                className="sm:col-span-5 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={locCode}
                onChange={(e) => setLocCode(e.target.value)}
                placeholder="Code (BLD-1)"
                className="sm:col-span-3 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={locZone}
                onChange={(e) => setLocZone(e.target.value)}
                placeholder="Zone"
                className="sm:col-span-4 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <label className="sm:col-span-7 flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={locDesk}
                  onChange={(e) => setLocDesk(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Includes Security Desk</span>
              </label>
              <button
                type="submit"
                className="sm:col-span-5 py-1.5 px-3 text-xs font-semibold text-white bg-[#1769AA] rounded-lg inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Location</span>
              </button>
            </form>

            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {locations.map((l) => (
                <div key={l.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[#10243B] truncate">
                      {l.name} ({l.buildingCode})
                    </p>
                    <p className="text-slate-500">
                      {l.zone} · ({l.mapX}%, {l.mapY}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateLocation(l.id, { hasSecurityDesk: !l.hasSecurityDesk })}
                      className={`px-2 py-1 rounded text-[11px] font-semibold ${
                        l.hasSecurityDesk
                          ? 'bg-emerald-50 text-[#16A36A] border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {l.hasSecurityDesk ? 'Desk On' : 'No Desk'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLocation(l.id)}
                      aria-label={`Remove ${l.name}`}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs bg-[#F6F8FB] p-3 rounded-lg">
              <p className="font-bold text-[#10243B] flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-[#16A36A]" />
                <span>Good Samaritan XP Schedule</span>
              </p>
              <div className="flex justify-between">
                <span>Valid Found Report</span>
                <span className="font-mono-num font-bold text-[#16A36A]">+10 XP</span>
              </div>
              <div className="flex justify-between">
                <span>Verified Successful Return</span>
                <span className="font-mono-num font-bold text-[#16A36A]">+100 XP</span>
              </div>
              <div className="flex justify-between">
                <span>Every 5th Return Milestone</span>
                <span className="font-mono-num font-bold text-[#16A36A]">+100 XP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="px-6 py-4">
            <h2 className="text-base font-bold text-[#10243B]">System Audit Trail</h2>
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No audit trail events logged yet.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.logId} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-[#10243B]">{log.actorName}</span>{' '}
                  <span className="text-slate-700">{log.action}</span>
                  {log.details && <span className="text-slate-500"> · {log.details}</span>}
                </div>
                <span className="font-mono-num text-slate-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </AppShell>
  );
};
