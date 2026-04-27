'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useClientApi } from '@/lib/api/client-api';
import { isAuthBypassEnabled } from '@/lib/auth-bypass-config';
import type { Notification } from '@obrafacil/shared';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
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

export function NotificationBell() {
  const router = useRouter();
  const api = useClientApi();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isLoaded } = isAuthBypassEnabled ? { isLoaded: true } : useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Wait for Clerk to hydrate before making authenticated requests.
  // Without this guard, getToken() returns null on first render → 401.
  useEffect(() => {
    if (!isLoaded) return;
    api.get<{ count: number }>('/v1/notifications/count')
      .then((res) => setUnreadCount(res.count))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleBellClick() {
    if (open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const data = await api.get<Notification[]>('/v1/notifications');
      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleItemClick(notif: Notification) {
    setOpen(false);
    // Mark as read
    if (!notif.is_read) {
      await api.patch(`/v1/notifications/${notif.id}/read`, {})
        .catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notif.link) {
      router.push(notif.link);
    }
  }

  async function handleMarkAllRead() {
    await api.patch('/v1/notifications/read-all', {}).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        className="relative w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
        aria-label="Notificações"
      >
        <span className="material-symbols-outlined text-slate-500 text-lg">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-brand rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-800">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#ec5b13] hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="py-8 text-center text-sm text-slate-400">
                Carregando...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-3xl">
                  notifications_none
                </span>
                <p className="text-sm">Nenhuma notificação ainda</p>
              </div>
            )}
            {!loading &&
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!notif.is_read ? 'bg-orange-50/60' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${!notif.is_read ? 'bg-brand/10' : 'bg-slate-100'}`}
                  >
                    <span
                      className={`material-symbols-outlined text-sm ${!notif.is_read ? 'text-brand' : 'text-slate-400'}`}
                    >
                      {TYPE_ICON[notif.type] ?? 'notifications'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold leading-tight ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/perfil/notificacoes');
              }}
              className="w-full text-center text-xs font-semibold text-[#ec5b13] hover:underline"
            >
              Ver todas →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
