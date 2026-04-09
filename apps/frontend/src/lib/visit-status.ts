export const VISIT_STATUS_MAP: Record<
  string,
  { label: string; variant: 'agendado' | 'entregue' | 'cancelado' }
> = {
  confirmed: { label: 'Confirmada', variant: 'agendado' },
  completed: { label: 'Concluída', variant: 'entregue' },
  cancelled: { label: 'Cancelada', variant: 'cancelado' },
};
