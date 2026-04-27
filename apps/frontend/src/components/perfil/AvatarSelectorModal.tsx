'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  PRESET_AVATARS,
  getRecommendedAvatars,
  type PresetAvatar,
} from '@/lib/avatars/presets';
import { useClientApi } from '@/lib/api/client-api';
import { Avatar } from '@/components/ui/Avatar';

type Tab = 'recomendados' | 'cliente' | 'profissional' | 'todos';

interface AvatarSelectorModalProps {
  currentAvatarId?: string | null;
  /** URL legada (Clerk/avatar_url) usada apenas como fallback de preview. */
  currentAvatarUrl?: string | null;
  name: string;
  actingAs: 'client' | 'professional';
  specialty?: string | null;
}

function PresetAvatarCard({
  avatar,
  isSelected,
  onClick,
}: {
  avatar: PresetAvatar;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all ${
        isSelected
          ? 'border-[#ec5b13] bg-orange-50 shadow-md scale-[1.03]'
          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 relative">
        <Image src={avatar.imageUrl} alt={avatar.label} fill className="object-cover" sizes="64px" />
      </div>
      <span className="text-[10px] font-medium text-slate-500 leading-tight text-center">{avatar.label}</span>
      {isSelected && (
        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#ec5b13] flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-xs leading-none filled">check</span>
        </span>
      )}
    </button>
  );
}

export function AvatarSelectorModal({
  currentAvatarId,
  currentAvatarUrl,
  name,
  actingAs,
  specialty,
}: AvatarSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('recomendados');
  const [selectedId, setSelectedId] = useState<string | null>(currentAvatarId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useClientApi();
  const router = useRouter();

  const recommended = getRecommendedAvatars(actingAs, specialty);
  const clientAvatars = PRESET_AVATARS.filter((a) => a.profileType === 'CLIENT' || a.profileType === 'BOTH');
  const professionalAvatars = PRESET_AVATARS.filter((a) => a.profileType === 'PROFESSIONAL' || a.profileType === 'BOTH');

  const tabAvatars: Record<Tab, PresetAvatar[]> = {
    recomendados: recommended,
    cliente: clientAvatars,
    profissional: professionalAvatars,
    todos: PRESET_AVATARS,
  };

  const displayedAvatars = tabAvatars[activeTab];

  const previewAvatar = selectedId
    ? PRESET_AVATARS.find((a) => a.id === selectedId)
    : null;

  async function handleSave() {
    if (selectedId === currentAvatarId) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await api.patch('/v1/account/profile', { avatar_id: selectedId });
      router.refresh();
      setIsOpen(false);
    } catch {
      setError('Erro ao salvar avatar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setSelectedId(currentAvatarId ?? null);
    setIsOpen(false);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'recomendados', label: 'Recomendados' },
    { id: 'cliente', label: 'Cliente' },
    { id: 'profissional', label: 'Profissional' },
    { id: 'todos', label: 'Todos' },
  ];

  return (
    <>
      {/* Trigger: circular avatar preview + "Alterar foto" CTA */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar
            avatarId={currentAvatarId}
            src={currentAvatarUrl}
            name={name}
            size="xl"
          />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#ec5b13] shadow-md flex items-center justify-center hover:bg-[#d44f0f] transition-colors"
            aria-label="Alterar foto de perfil"
          >
            <span className="material-symbols-outlined text-white text-base leading-none">edit</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-sm font-medium text-[#ec5b13] hover:underline"
        >
          Alterar foto de perfil
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de avatares"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCancel}
          />

          {/* Modal panel */}
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-slate-900">Escolha seu avatar</h2>
              <button
                type="button"
                onClick={handleCancel}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-500 text-lg leading-none">close</span>
              </button>
            </div>

            {/* Preview + tabs */}
            <div className="px-5 pb-3 flex-shrink-0">
              {/* Preview do avatar selecionado */}
              {previewAvatar && (
                <div className="flex items-center gap-3 mb-3 bg-orange-50 rounded-xl px-3 py-2.5">
                  <div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
                    <Image src={previewAvatar.imageUrl} alt={previewAvatar.label} fill className="object-cover" sizes="40px" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Selecionado</p>
                    <p className="text-sm font-semibold text-slate-800">{previewAvatar.label}</p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar grid */}
            <div className="px-5 overflow-y-auto flex-1">
              {displayedAvatars.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum avatar disponível nesta categoria.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 pb-4">
                  {displayedAvatars.map((avatar) => (
                    <PresetAvatarCard
                      key={avatar.id}
                      avatar={avatar}
                      isSelected={selectedId === avatar.id}
                      onClick={() => setSelectedId(avatar.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex-shrink-0">
              {error && (
                <p className="text-xs text-red-500 mb-2 text-center">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-[#ec5b13] text-sm font-semibold text-white hover:bg-[#d44f0f] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Salvando…' : 'Salvar avatar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
