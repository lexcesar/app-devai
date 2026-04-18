import { test, expect } from '@playwright/test';

test.describe('Cliente — fluxo de pedidos (bypass user: demo_client_001)', () => {
  test('vê Meus Pedidos com pedidos próprios e navega para detalhe', async ({
    page,
  }) => {
    await page.goto('/pedidos');
    await expect(
      page.getByRole('heading', { name: 'Meus Pedidos' }),
    ).toBeVisible();

    // Seeded for Carlos Alberto (demo_client_001)
    await expect(page.getByText('#88421')).toBeVisible();
    await expect(page.getByText('#88390')).toBeVisible();

    // Status badges
    await expect(page.getByText('A CAMINHO').first()).toBeVisible();
    await expect(page.getByText('ENTREGUE').first()).toBeVisible();
  });

  test('acessa a tela de Cotação com IA', async ({ page }) => {
    await page.goto('/cotacao/ia');
    await expect(
      page.getByRole('heading', { name: 'Cotação com IA' }),
    ).toBeVisible();

    const textarea = page.getByLabel(/descreva sua obra/i);
    await expect(textarea).toBeVisible();
    await textarea.fill('Reformar meu banheiro pequeno de 4m²');

    // Button enabled after 10+ chars
    const button = page.getByRole('button', {
      name: /gerar lista de materiais/i,
    });
    await expect(button).toBeEnabled();
  });

  test('busca de profissionais carrega', async ({ page }) => {
    await page.goto('/busca');
    // page should render without 500
    await expect(page.locator('body')).toBeVisible();
  });
});
