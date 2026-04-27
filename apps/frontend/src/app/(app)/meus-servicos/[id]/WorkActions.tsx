'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientApi } from '@/lib/api/client-api';

interface WorkActionsProps {
  workId: string;
  status: string;
  progressPct: number;
}

export function WorkActions({ workId, status, progressPct }: WorkActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(progressPct);
  const [editingProgress, setEditingProgress] = useState(false);

  const api = useClientApi();

  const patch = async (path: string, body?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/v1/works/${workId}/${path}`, body ?? {});
      router.refresh();
      return true;
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erro ao atualizar obra');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    const ok = await patch('progress', { progressPct: progress });
    if (ok) setEditingProgress(false);
  };

  if (status === 'completed') {
    return (
      <div className="bg-green-50 rounded-2xl border border-green-100 p-4 text-center">
        <span className="material-symbols-outlined text-3xl text-green-500 block mb-1">task_alt</span>
        <p className="text-sm font-semibold text-green-700">Obra concluída</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Atualizar progresso */}
      {status === 'active' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Atualizar Progresso</p>

          {editingProgress ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="flex-1 accent-trust"
                />
                <span className="text-sm font-bold text-trust w-10 text-right">{progress}%</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateProgress}
                  disabled={loading}
                  className="flex-1 h-10 bg-trust text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      Salvar
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setEditingProgress(false); setProgress(progressPct); }}
                  disabled={loading}
                  className="flex-1 h-10 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingProgress(true)}
              className="w-full h-10 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              Atualizar progresso ({progressPct}%)
            </button>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="space-y-2">
        {status === 'scheduled' && (
          <button
            onClick={() => patch('start')}
            disabled={loading}
            className="w-full h-12 bg-trust text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">play_circle</span>
                Iniciar Obra
              </>
            )}
          </button>
        )}

        {status === 'active' && (
          <button
            onClick={() => patch('complete')}
            disabled={loading}
            className="w-full h-12 bg-green-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">check_circle</span>
                Marcar como Concluída
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 text-center font-medium py-1">{error}</p>
      )}
    </div>
  );
}
