'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientApi } from '@/lib/api/client-api';
import type { Notification } from '@obrafacil/shared';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

const TYPE_ICON: Record<string, string> = {
  visit_requested: 'pending_actions',
  visit_accepted: 'event_available',
  visit_rejected: 'event_busy',
  visit_cancelled: 'event_busy',
  visit_completed: 'task_alt',
  work_started: 'construction',
  work_completed: 'check_circle',
  work_progress: 'trending_up',
};

interface Props {
  initialNotifications: Notification[];
}

export function NotificationsListClient({ initialNotifications }: Props) {
  const router = useRouter();
  const api = useClientApi();
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);

  async function handleClick(notif: Notification) {
    if (!notif.is_read) {
      await api.patch(`/v1/notifications/${notif.id}/read`, {}).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
    }
    if (notif.link) {
      router.push(notif.link);
    }
  }

  async function handleMarkAllRead() {
    await api.patch('/v1/notifications/read-all', {}).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (notifications.length === 0) {
    return (
      <div className="px-4 mt-12 flex flex-col items-center text-center gap-3">
        <span className="material-symbols-outlined text-5xl text-slate-300">
          notifications_none
        </span>
        <p className="text-sm font-semibold text-slate-600">
          Nenhuma notificação ainda
        </p>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Você verá aqui os alertas sobre visitas e atualizações de obras.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 mt-4">
      {unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-[#ec5b13] hover:underline"
          >
            Marcar todas como lidas
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notif) => (
          <button
            key={notif.id}
            onClick={() => handleClick(notif)}
            className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-2xl border transition-colors ${
              !notif.is_read
                ? 'bg-orange-50/70 border-orange-100'
                : 'bg-white border-slate-100'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${!notif.is_read ? 'bg-brand/10' : 'bg-slate-100'}`}
            >
              <span
                className={`material-symbols-outlined text-base ${!notif.is_read ? 'text-brand' : 'text-slate-400'}`}
              >
                {TYPE_ICON[notif.type] ?? 'notifications'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}
              >
                {notif.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {notif.message}
              </p>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {timeAgo(notif.created_at)}
              </p>
            </div>
            {!notif.is_read && (
              <span className="w-2.5 h-2.5 rounded-full bg-brand flex-shrink-0 mt-1.5" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
