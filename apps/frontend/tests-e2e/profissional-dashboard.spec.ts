import { test, expect } from '@playwright/test';

// To test the professional view, the app must have been started with
// NEXT_PUBLIC_BYPASS_USER_CLERK_ID=demo_professional_001 in its env.
const bypassUser = process.env.E2E_BYPASS_USER ?? 'demo_client_001';
const isProfessionalRun = bypassUser === 'demo_professional_001';

test.describe('Dashboard profissional', () => {
  test.skip(
    !isProfessionalRun,
    'Pula a menos que E2E_BYPASS_USER=demo_professional_001',
  );

  test('profissional vê stats e obras ativas', async ({ page }) => {
    await page.goto('/profissional/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Meu Dashboard' }),
    ).toBeVisible();
    await expect(page.getByText(/olá/i)).toBeVisible();
  });
});

test.describe('Dashboard — negação para cliente', () => {
  test.skip(
    isProfessionalRun,
    'Pula quando rodando como profissional',
  );

  test('cliente vê mensagem de acesso restrito', async ({ page }) => {
    await page.goto('/profissional/dashboard');
    await expect(
      page.getByText(/dashboard disponível apenas para profissionais/i),
    ).toBeVisible();
  });
});
