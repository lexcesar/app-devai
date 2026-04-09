'use client';
// StartConversationButton — creates a conversation and navigates to chat
// Used on INT-02 (Professional Profile) CTA per spec_ui.md
// Calls POST /api/v1/conversations, then redirects to /chat/:id

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from './StickyBottomCTA';

interface StartConversationButtonProps {
  professionalId: string;
}

export function StartConversationButton({ professionalId }: StartConversationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalProfileId: professionalId }),
      });

      if (!res.ok) {
        setError('Nao foi possivel iniciar conversa. Tente novamente.');
        return;
      }

      const envelope = await res.json() as { data: { id: string } };
      router.push(`/chat/${envelope.data.id}`);
    } catch {
      setError('Erro de conexao. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <PrimaryButton variant="trust" onClick={handleStart} loading={loading}>
        <span className="material-symbols-outlined text-xl">chat</span>
        Enviar Mensagem
      </PrimaryButton>
      {error && (
        <p className="text-xs text-error text-center font-medium">{error}</p>
      )}
    </div>
  );
}
