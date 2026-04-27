'use client';

// TopBar — Desktop-only sticky header (md+)
// Shows SearchBar + notifications + user avatar.
// Design: Stitch home_obra_direta_web — ml-64, h-14, bg-white, shadow subtle.
// Hidden on mobile (mobile header inside each page takes over).

import Link from 'next/link';
import { SearchBar } from '@/components/ui/SearchBar';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Avatar } from '@/components/ui/Avatar';

interface TopBarProps {
  /** Display name of the authenticated user (passed from server component) */
  userName?: string;
  /** ID do avatar preset selecionado (profiles.avatar_id). */
  avatarId?: string;
  /** Avatar URL legada (profiles.avatar_url / Clerk). Fallback. */
  avatarUrl?: string;
}

export function TopBar({ userName, avatarId, avatarUrl }: TopBarProps) {
  return (
    <header className="hidden md:flex fixed top-0 left-64 right-0 z-20 h-14 items-center gap-4 bg-surface-container-lowest border-b border-outline-variant/15 px-6 shadow-[0_2px_16px_rgba(0,40,142,0.04)]">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <SearchBar placeholder="Encontre um encanador, pedreiro..." />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notifications */}
        <NotificationBell />

        {/* User avatar */}
        <Link
          href="/perfil"
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-container-low transition-colors"
          aria-label="Meu perfil"
        >
          <Avatar
            avatarId={avatarId}
            src={avatarUrl}
            name={userName ?? 'U'}
            size="xs"
          />
          {userName && (
            <span className="text-sm font-medium text-on-surface hidden lg:inline">
              {userName}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
