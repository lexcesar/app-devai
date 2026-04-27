'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AccountContext, UserRole } from '@obrafacil/shared';
import { useRole } from '@/contexts/RoleContext';
import { useClientApi } from '@/lib/api/client-api';

const ROLE_LABELS: Record<UserRole, string> = {
  client: 'Cliente',
  professional: 'Profissional',
  store: 'Loja',
};

const ROLE_ICONS: Record<UserRole, string> = {
  client: 'person',
  professional: 'construction',
  store: 'storefront',
};



export function RoleSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const { actingAs, setRole } = useRole();
  const clientApi = useClientApi();

  useEffect(() => {
    clientApi.get<AccountContext>('/v1/account/me')
      .then((account) => setRoles(account.roles))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (roles.length <= 1) return null;

  function switchRole(role: UserRole) {
    if (role === actingAs) return;
    setRole(role);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-1 bg-surface-container-low rounded-xl px-1 py-1"
      aria-label="Alternar papel"
    >
      {roles.map((role) => {
        const isActive = role === actingAs;
        return (
          <button
            key={role}
            onClick={() => switchRole(role)}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-brand text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
            aria-pressed={isActive}
            title={`Atuar como ${ROLE_LABELS[role]}`}
          >
            <span className="material-symbols-outlined text-sm leading-none">
              {ROLE_ICONS[role]}
            </span>
            {ROLE_LABELS[role]}
          </button>
        );
      })}
    </div>
  );
}
