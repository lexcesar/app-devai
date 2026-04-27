// Catálogo central de avatares preset.
// Cada avatar tem um ID único que é armazenado em profiles.avatar_id.
// A URL é relativa à pasta public/ do Next.js — servida como arquivo estático.

export type AvatarProfileType = 'CLIENT' | 'PROFESSIONAL' | 'BOTH';

export interface PresetAvatar {
  id: string;
  label: string;
  imageUrl: string;
  profileType: AvatarProfileType;
  /** Especialidades profissionais recomendadas para este avatar */
  recommendedForSpecialties?: string[];
}

export const PRESET_AVATARS: PresetAvatar[] = [
  // ── Clientes ────────────────────────────────────────────────────────────
  {
    id: 'client-neutral-01',
    label: 'Homem',
    imageUrl: '/avatars/clients/client-neutral-01.png',
    profileType: 'CLIENT',
  },
  {
    id: 'client-young-01',
    label: 'Mulher',
    imageUrl: '/avatars/clients/client-young-01.png',
    profileType: 'CLIENT',
  },
  {
    id: 'client-family-01',
    label: 'Casal',
    imageUrl: '/avatars/clients/client-family-01.png',
    profileType: 'CLIENT',
  },
  {
    id: 'client-home-01',
    label: 'Proprietário',
    imageUrl: '/avatars/clients/client-home-01.svg',
    profileType: 'CLIENT',
  },

  // ── Profissionais ────────────────────────────────────────────────────────
  {
    id: 'professional-electrician-01',
    label: 'Eletricista',
    imageUrl: '/avatars/professionals/professional-electrician-01.png',
    profileType: 'PROFESSIONAL',
    recommendedForSpecialties: ['eletric', 'elétric'],
  },
  {
    id: 'professional-plumber-01',
    label: 'Encanador',
    imageUrl: '/avatars/professionals/professional-plumber-01.png',
    profileType: 'PROFESSIONAL',
    recommendedForSpecialties: ['encanad', 'hidráulica', 'hidraulica'],
  },
  {
    id: 'professional-mason-01',
    label: 'Pedreiro',
    imageUrl: '/avatars/professionals/professional-mason-01.png',
    profileType: 'PROFESSIONAL',
    recommendedForSpecialties: ['pedreir', 'alvenar', 'construção', 'construcao'],
  },
  {
    id: 'professional-painter-01',
    label: 'Pintor',
    imageUrl: '/avatars/professionals/professional-painter-01.png',
    profileType: 'PROFESSIONAL',
    recommendedForSpecialties: ['pintor', 'pintura'],
  },
  {
    id: 'professional-cleaner-01',
    label: 'Diarista',
    imageUrl: '/avatars/professionals/professional-cleaner-01.png',
    profileType: 'PROFESSIONAL',
    recommendedForSpecialties: ['diarista', 'limpeza', 'faxina'],
  },
  {
    id: 'professional-carpenter-01',
    label: 'Marceneiro',
    imageUrl: '/avatars/professionals/professional-carpenter-01.svg',
    profileType: 'PROFESSIONAL',
    recommendedForSpecialties: ['marceneir', 'carpinteir', 'madeira'],
  },
  {
    id: 'professional-gardener-01',
    label: 'Jardineiro',
    imageUrl: '/avatars/professionals/professional-gardener-01.svg',
    profileType: 'PROFESSIONAL',
    recommendedForSpecialties: ['jardineir', 'jardinagem', 'paisagi'],
  },
  {
    id: 'professional-generic-01',
    label: 'Profissional',
    imageUrl: '/avatars/professionals/professional-generic-01.svg',
    profileType: 'PROFESSIONAL',
  },
];

/** Resolve an avatar_id to its image URL, returning null if not found. */
export function resolveAvatarUrl(avatarId: string | null | undefined): string | null {
  if (!avatarId) return null;
  return PRESET_AVATARS.find((a) => a.id === avatarId)?.imageUrl ?? null;
}

/**
 * Returns avatars recommended for the given role/specialty.
 * Always includes BOTH-type avatars.
 * For professionals, scores avatars whose recommendedForSpecialties matches the specialty string.
 */
export function getRecommendedAvatars(
  actingAs: 'client' | 'professional',
  specialty?: string | null,
): PresetAvatar[] {
  const roleType: AvatarProfileType = actingAs === 'professional' ? 'PROFESSIONAL' : 'CLIENT';

  const candidates = PRESET_AVATARS.filter(
    (a) => a.profileType === roleType || a.profileType === 'BOTH',
  );

  if (!specialty || actingAs !== 'professional') return candidates;

  const specialtyLower = specialty.toLowerCase();

  // Sort so specialty-matched avatars come first
  return [...candidates].sort((a, b) => {
    const aMatch = a.recommendedForSpecialties?.some((s) => specialtyLower.includes(s)) ? -1 : 0;
    const bMatch = b.recommendedForSpecialties?.some((s) => specialtyLower.includes(s)) ? -1 : 0;
    return aMatch - bMatch;
  });
}
