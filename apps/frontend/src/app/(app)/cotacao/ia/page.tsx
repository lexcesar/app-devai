'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DEV_USER_ID_HEADER } from '@obrafacil/shared';
import {
  BYPASS_USER_CLERK_ID,
  isAuthBypassEnabled,
} from '@/lib/auth-bypass-config';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

type MaterialItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

type Quote = {
  items: MaterialItem[];
  estimated_total_brl: number | null;
  notes: string;
  model: string;
};

export default function CotacaoIaPage() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (isAuthBypassEnabled) {
        headers[DEV_USER_ID_HEADER] = BYPASS_USER_CLERK_ID;
      }
      const res = await fetch(`${API_URL}/v1/ai/material-quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const envelope = (await res.json()) as { data: Quote };
      setQuote(envelope.data);
    } catch (err) {
      setError((err as Error).message ?? 'Erro ao gerar cotação');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-24 bg-surface min-h-screen">
      <div className="bg-white">
        <div className="flex items-center px-4 pt-10 pb-3">
          <Link href="/" className="mr-3">
            <span className="material-symbols-outlined text-slate-700 text-xl">
              arrow_back
            </span>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Cotação com IA</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <label
            htmlFor="description"
            className="text-xs font-bold text-slate-500 uppercase tracking-wide"
          >
            Descreva sua obra ou reforma
          </label>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Exemplo: &quot;Reformar banheiro de 4m², trocar piso, revestimento,
            louças e metais.&quot;
          </p>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-trust/30"
            placeholder="Escreva aqui..."
          />
          <p className="text-[10px] text-slate-400 mt-1">
            {description.length} / 2000
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading || description.trim().length < 10}
            className="mt-3 w-full bg-trust text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Gerando...' : 'Gerar lista de materiais'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
            <p className="font-semibold">Erro</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-trust border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">
              Analisando sua obra com IA...
            </p>
          </div>
        )}

        {quote && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Materiais sugeridos
              </p>
              <span className="text-[10px] text-slate-400">
                {quote.items.length} itens
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {quote.items.map((item, i) => (
                <li
                  key={i}
                  className="py-2.5 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wide mt-0.5">
                      {item.category}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {quote.estimated_total_brl !== null && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Estimativa total</p>
                <p className="text-base font-bold text-slate-900">
                  R${' '}
                  {quote.estimated_total_brl.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
            {quote.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  Observações
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {quote.notes}
                </p>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-3 text-right">
              gerado por {quote.model}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
