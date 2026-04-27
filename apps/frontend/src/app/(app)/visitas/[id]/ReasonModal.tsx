'use client';

import { useState } from 'react';

interface ReasonModalProps {
  title: string;
  subtitle: string;
  placeholder: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export function ReasonModal({
  title,
  subtitle,
  placeholder,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Informe o motivo');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-red-500 text-xl">cancel</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Motivo <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/40 focus:border-[#ec5b13]"
        />
        <p className="text-[10px] text-slate-300 text-right mt-0.5">{reason.length}/500</p>

        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className={`flex-1 h-10 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 ${confirmClassName}`}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
