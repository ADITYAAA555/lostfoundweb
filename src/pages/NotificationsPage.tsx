import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';

export const NotificationsPage: React.FC = () => {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const myNotifications = useMemo(() => {
    const list = notifications
      .filter((n) => n.userId === currentUser?.userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return filter === 'unread' ? list.filter((n) => !n.isRead) : list;
  }, [notifications, currentUser, filter]);

  return (
    <AppShell
      title="Notifications"
      subtitle="AI match alerts, claim updates, XP awards, and security handover notices"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md ${
              filter === 'all' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
            }`}
          >
            All Notifications
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md ${
              filter === 'unread' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
            }`}
          >
            Unread Only
          </button>
        </div>

        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1769AA] hover:bg-blue-50 rounded-lg"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark all as read</span>
        </button>
      </div>

      {myNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <Bell className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-[#10243B]">No notifications here</p>
          <p className="text-xs text-slate-500">You are up to date on all matches and claims.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {myNotifications.map((n) => (
            <div
              key={n.notificationId}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                n.isRead ? 'bg-white' : 'bg-blue-50/40'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold uppercase text-[#1769AA]">{n.type}</span>
                  <span>·</span>
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  {!n.isRead && <span className="font-semibold text-[#16A36A]">· Unread</span>}
                </div>
                <p className={`text-sm ${n.isRead ? 'text-slate-700' : 'text-[#10243B] font-semibold'}`}>
                  {n.message}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {n.relatedPath && (
                  <Link
                    to={n.relatedPath}
                    className="px-3 py-1.5 text-xs font-semibold text-[#1769AA] border border-blue-200 rounded-lg hover:bg-blue-50"
                  >
                    Open
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.notificationId)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
};
