'use client';
// Cotação interactive section — radio store selection + checkout CTA
// spec_ui.md INT-04: "Seleção em rádio nas Top 3 Melhores Ofertas Locais"
// prd.md RFN-03: "Confirmar e Ir Para o Pagamento"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoreOfferWithStore } from '@obrafacil/shared';
import { StickyBottomCTA, PrimaryButton } from '@/components/ui/StickyBottomCTA';
import { useClientApi } from '@/lib/api/client-api';

interface CotacaoClientProps {
  listId: string;
  offers: StoreOfferWithStore[];
  defaultSelectedId: string | null;
}

export function CotacaoClient({
  listId,
  offers,
  defaultSelectedId,
}: CotacaoClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const api = useClientApi();

  const selectedOffer = offers.find((o) => o.id === selectedId);
  const cheapestPrice = Number(offers[0]?.total_price ?? 0);

  const handleConfirm = async () => {
    if (!selectedOffer) return;
    setLoading(true);
    setError(null);

    try {
      await api.post('/v1/orders', {
        storeId: selectedOffer.stores?.id,
        materialListId: listId,
        totalAmount: selectedOffer.total_price,
        deliveryAddress: '',
      });
      router.push('/solicitacoes');
    } catch {
      setError('Nao foi possivel confirmar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Top 3 radio buttons ─────────────────────────────────── */}
      <div className="px-4 mt-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Top 3 Melhores Ofertas Locais</h2>
        <div className="flex flex-col gap-3">
          {offers.map((offer, idx) => {
            const isSelected = selectedId === offer.id;
            const savingsVsThis =
              cheapestPrice > 0 && Number(offer.total_price) > cheapestPrice
                ? Number(offer.total_price) - cheapestPrice
                : null;

            return (
              <label
                key={offer.id}
                className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-savings bg-emerald-50'
                    : 'border-slate-100 bg-white'
                }`}
                onClick={() => setSelectedId(offer.id)}
              >
                {/* Rank badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    idx === 0
                      ? 'bg-savings text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {idx + 1}°
                </div>

                {/* Store info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {offer.stores?.name ?? 'Loja'}
                    </p>
                    {offer.is_best_price && (
                      <span className="text-[9px] font-bold text-savings bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        MELHOR PREÇO
                      </span>
                    )}
                  </div>
                  {offer.stores?.delivery_time != null && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Entrega em {offer.stores.delivery_time}
                    </p>
                  )}
                  {savingsVsThis && (
                    <p className="text-[10px] text-error mt-0.5">
                      +R$ {savingsVsThis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a mais
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-base font-black ${
                      idx === 0 ? 'text-savings' : 'text-slate-900'
                    }`}
                  >
                    R${' '}
                    {Number(offer.total_price).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-[9px] text-slate-400">total</p>
                </div>

                {/* Radio indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-savings' : 'border-slate-300'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-savings" />
                  )}
                </div>

                {/* Hidden native radio for accessibility */}
                <input
                  type="radio"
                  name="store-offer"
                  value={offer.id}
                  checked={isSelected}
                  onChange={() => setSelectedId(offer.id)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Selected summary ──────────────────────────────────────── */}
      {selectedOffer && (
        <div className="mx-4 mt-4 bg-slate-50 rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">Total selecionado</p>
            <p className="text-lg font-bold text-slate-900">
              R${' '}
              {Number(selectedOffer.total_price).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            em {selectedOffer.stores?.name ?? 'loja selecionada'}
          </p>
        </div>
      )}

      {/* Error feedback */}
      {error && (
        <div className="mx-4 mt-4 bg-error/10 border border-error/20 rounded-xl p-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-lg">error</span>
          <p className="text-xs text-error font-medium">{error}</p>
        </div>
      )}

      {/* ── Sticky CTA ── */}
      <StickyBottomCTA>
        <PrimaryButton
          variant="savings"
          className="w-full"
          onClick={handleConfirm}
          disabled={!selectedId || loading}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-xl">shopping_cart_checkout</span>
          )}
          {loading ? 'Processando...' : 'Confirmar Pedido'}
        </PrimaryButton>
      </StickyBottomCTA>
    </>
  );
}
