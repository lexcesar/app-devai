'use client';

import { useState } from 'react';
import { useClientApi } from '@/lib/api/client-api';
import type { ReviewWithReviewer } from '@obrafacil/shared';

interface ReviewFormProps {
  workId: string;
  professionalName: string;
  existingReview?: ReviewWithReviewer | null;
}

function StarSelector({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange: (v: number) => void;
  readonly: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const display = readonly ? value : hovered || value;

  return (
    <div className="flex gap-1" role="group" aria-label="Classificação em estrelas">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`text-3xl transition-transform ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
        >
          <span style={{ color: star <= display ? '#f59e0b' : '#d1d5db' }}>
            {star <= display ? '★' : '☆'}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ workId, professionalName, existingReview }: ReviewFormProps) {
  const api = useClientApi();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(!!existingReview);

  const isReadonly = submitted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Selecione uma nota para continuar.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/v1/works/${workId}/review`, {
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (isReadonly) {
    const reviewDate = existingReview?.created_at
      ? new Date(existingReview.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-savings text-xl">verified</span>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sua Avaliação</p>
        </div>
        <div className="flex flex-col gap-2">
          <StarSelector value={rating} onChange={() => {}} readonly />
          {comment && (
            <p className="text-sm text-slate-600 leading-relaxed mt-1 italic">&ldquo;{comment}&rdquo;</p>
          )}
          <p className="text-[10px] text-slate-400 mt-1">Enviada em {reviewDate}</p>
        </div>
        <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50">
          Obrigado pelo seu feedback. Sua avaliação ajuda outros clientes a escolherem bons
          profissionais.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-savings/30 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-savings text-xl">star</span>
        <p className="text-sm font-bold text-slate-900">Avalie o atendimento</p>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Como foi sua experiência com {professionalName}?
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Star selector */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Classificação</p>
          <StarSelector value={rating} onChange={setRating} readonly={false} />
          {error && error.includes('nota') && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label htmlFor={`review-comment-${workId}`} className="text-xs font-medium text-slate-600 mb-2 block">
            Comentário <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            id={`review-comment-${workId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Ex: profissional pontual, educado, serviço bem executado..."
            className="w-full text-sm text-slate-700 placeholder-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-savings/30 focus:border-savings transition"
          />
          <p className="text-[10px] text-slate-400 text-right mt-0.5">{comment.length}/1000</p>
        </div>

        {/* General error */}
        {error && !error.includes('nota') && (
          <p className="text-xs text-red-500 -mt-2">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all bg-savings hover:bg-emerald-600 text-white disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Enviando avaliação...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">send</span>
              Enviar avaliação
            </>
          )}
        </button>
      </form>
    </div>
  );
}
