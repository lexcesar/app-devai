'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientApi } from '@/lib/api/client-api';

interface Props {
  initialName: string;
  onUpdated?: (newName: string) => void;
}

export function ProfileNameEditor({ initialName, onUpdated }: Props) {
  const router = useRouter();
  const api = useClientApi();
  const isPlaceholder = !initialName || initialName === 'Usuário';

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(isPlaceholder ? '' : initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nome não pode ser vazio');
      return;
    }
    if (trimmed.length < 2) {
      setError('Nome deve ter ao menos 2 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.patch('/v1/account/profile', { full_name: trimmed });
      setSuccess(true);
      setEditing(false);
      onUpdated?.(trimmed);
      setTimeout(() => setSuccess(false), 3000);
      // Revalidate server components (layout, page) without a full reload
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar nome');
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-2 w-full max-w-xs">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            maxLength={100}
            autoFocus
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trust/30 focus:border-trust"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <button
            onClick={handleSave}
            disabled={loading}
            className="text-xs font-semibold text-white bg-trust px-3 py-2 rounded-lg disabled:opacity-50 transition-opacity"
          >
            {loading ? '...' : 'Salvar'}
          </button>
          <button
            onClick={() => { setEditing(false); setError(null); }}
            className="text-xs text-slate-400 px-2 py-2 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      {isPlaceholder && (
        <div className="mt-1 mb-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center">
          <p className="text-xs text-amber-700 font-medium">
            Você ainda não configurou seu nome.{' '}
            <button
              onClick={() => setEditing(true)}
              className="underline font-semibold"
            >
              Definir agora
            </button>
          </p>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {!isPlaceholder && (
          <button
            onClick={() => setEditing(true)}
            title="Editar nome"
            className="text-slate-300 hover:text-trust transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
        )}
        {success && (
          <span className="text-xs text-green-600 font-medium">✓ Nome atualizado</span>
        )}
      </div>
    </div>
  );
}
