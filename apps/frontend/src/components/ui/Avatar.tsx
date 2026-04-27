// Avatar — per Stitch prototypes: circular with online/verified indicator
// per spec_ui.md INT-02: "Foto grande e nítida"

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { resolveAvatarUrl } from '@/lib/avatars/presets';

interface AvatarProps {
  /** ID de um avatar preset da galeria (profiles.avatar_id). Prioridade máxima. */
  avatarId?: string | null;
  /** URL legada (profiles.avatar_url / Clerk). Fallback quando avatarId é nulo. */
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  isVerified?: boolean;
  className?: string;
}

const sizeClasses = {
  xs:  { container: 'w-8 h-8',   text: 'text-xs',   indicator: 'w-2 h-2' },
  sm:  { container: 'w-10 h-10', text: 'text-sm',   indicator: 'w-2.5 h-2.5' },
  md:  { container: 'w-12 h-12', text: 'text-base', indicator: 'w-3 h-3' },
  lg:  { container: 'w-16 h-16', text: 'text-lg',   indicator: 'w-3.5 h-3.5' },
  xl:  { container: 'w-24 h-24', text: 'text-2xl',  indicator: 'w-4 h-4' },
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export function Avatar({ avatarId, src, name, size = 'md', isOnline, isVerified, className = '' }: AvatarProps) {
  const s = sizeClasses[size];
  const [imgError, setImgError] = useState(false);

  // Priority: preset gallery (avatarId) → legacy URL (src) → initials
  const resolvedUrl = resolveAvatarUrl(avatarId) ?? src ?? null;

  return (
    <div className={`relative inline-flex rounded-full ${className}`}>
      <div className={`${s.container} relative rounded-full overflow-hidden ${avatarId ? 'bg-transparent' : 'bg-trust/10'} flex items-center justify-center flex-shrink-0`}>
        {resolvedUrl && !imgError ? (
          <Image
            src={resolvedUrl}
            alt={name}
            fill
            className={avatarId ? 'object-contain scale-[1.08]' : 'object-cover'}
            sizes="96px"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={`font-semibold text-trust ${s.text}`}>
            {getInitials(name)}
          </span>
        )}
      </div>

      {/* Online indicator (green dot) */}
      {isOnline && (
        <span className={`absolute bottom-0 right-0 ${s.indicator} rounded-full bg-savings border-2 border-white`} />
      )}

      {/* Verified badge */}
      {isVerified && !isOnline && (
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-trust flex items-center justify-center">
          <span className="material-symbols-outlined filled text-white text-xs leading-none">
            verified
          </span>
        </span>
      )}
    </div>
  );
}
