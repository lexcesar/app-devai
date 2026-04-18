import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders default label for each variant', () => {
    const { rerender } = render(<StatusBadge variant="a-caminho" />);
    expect(screen.getByText('A CAMINHO')).toBeInTheDocument();

    rerender(<StatusBadge variant="entregue" />);
    expect(screen.getByText('ENTREGUE')).toBeInTheDocument();

    rerender(<StatusBadge variant="cancelado" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('accepts a custom label override', () => {
    render(<StatusBadge variant="ativo" label="Em Execução" />);
    expect(screen.getByText('Em Execução')).toBeInTheDocument();
  });

  it('applies variant-specific classes', () => {
    const { container } = render(<StatusBadge variant="pendente" />);
    const span = container.querySelector('span');
    expect(span?.className).toMatch(/bg-amber-50/);
    expect(span?.className).toMatch(/text-amber-700/);
  });

  it('appends extra className when provided', () => {
    const { container } = render(
      <StatusBadge variant="entregue" className="extra-class" />,
    );
    expect(container.querySelector('span')?.className).toMatch(/extra-class/);
  });
});
