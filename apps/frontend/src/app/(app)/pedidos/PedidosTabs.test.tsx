import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PedidosTabs } from './PedidosTabs';

const ordersFixture = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    order_number: '88421',
    status: 'shipped',
    total_amount: 450.9,
    created_at: '2026-04-16T10:00:00Z',
    stores: { name: 'Construção Sul' },
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    order_number: '88390',
    status: 'delivered',
    total_amount: 1200,
    created_at: '2026-04-14T10:00:00Z',
    stores: { name: 'Materiais Avenida' },
  },
];

describe('PedidosTabs', () => {
  it('renders each order from the list', () => {
    render(<PedidosTabs orders={ordersFixture} />);
    expect(screen.getByText('Construção Sul')).toBeInTheDocument();
    expect(screen.getByText('Materiais Avenida')).toBeInTheDocument();
    expect(screen.getByText('Pedido #88421')).toBeInTheDocument();
    expect(screen.getByText('Pedido #88390')).toBeInTheDocument();
  });

  it('shows empty state when there are no orders (materiais tab)', () => {
    render(<PedidosTabs orders={[]} />);
    expect(screen.getByText('Nenhum pedido ainda')).toBeInTheDocument();
  });

  it('maps status to correct badge label', () => {
    render(<PedidosTabs orders={ordersFixture} />);
    expect(screen.getByText('A CAMINHO')).toBeInTheDocument();
    expect(screen.getByText('ENTREGUE')).toBeInTheDocument();
  });

  it('switches to "servicos" tab showing empty state', async () => {
    const user = userEvent.setup();
    render(<PedidosTabs orders={ordersFixture} />);

    await user.click(screen.getByRole('tab', { name: /servi/i }));

    expect(screen.getByText('Nenhum servico contratado')).toBeInTheDocument();
    // Materiais tab content is unmounted when switching
    expect(screen.queryByText('Construção Sul')).not.toBeInTheDocument();
  });

  it('formats total_amount with pt-BR locale', () => {
    render(<PedidosTabs orders={ordersFixture} />);
    expect(screen.getByText(/R\$\s*450,90/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.200,00/)).toBeInTheDocument();
  });
});
