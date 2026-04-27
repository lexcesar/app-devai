import { AppShell } from '@/components/layout/AppShell';
import { currentUser } from '@/lib/auth-bypass';
import { api } from '@/lib/api/client';
import type { AccountContext } from '@obrafacil/shared';

// All authenticated app routes share this layout with BottomNav (mobile) + SideNav/TopBar (desktop).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, account] = await Promise.all([
    currentUser().catch(() => null),
    api.get<AccountContext>('/v1/account/me').catch(() => null),
  ]);

  // Prefer DB profile data (profiles.full_name / profiles.avatar_url) over Clerk values.
  // Clerk is only used as fallback when the DB has no value yet.
  const clerkName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : undefined;
  const userName = account?.profile.full_name || clerkName || undefined;
  const avatarId = account?.profile.avatar_id ?? undefined;
  const avatarUrl = account?.profile.avatar_url ?? user?.imageUrl ?? undefined;

  return (
    <AppShell userName={userName} avatarId={avatarId} avatarUrl={avatarUrl}>
      {children}
    </AppShell>
  );
}
