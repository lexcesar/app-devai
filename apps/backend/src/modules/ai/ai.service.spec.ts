const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
);

import { AiService } from './ai.service';

describe('AiService.generateMaterialQuote', () => {
  let service: AiService;
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    mockCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    service = new AiService();
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('parses a well-formed JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            items: [
              { name: 'Tinta', quantity: 10, unit: 'l', category: 'pintura' },
            ],
            estimated_total_brl: 300,
            notes: 'ok',
          }),
        },
      ],
      usage: {},
    });

    const result = await service.generateMaterialQuote(
      'Pintar uma parede de 20m²',
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Tinta');
    expect(result.estimated_total_brl).toBe(300);
    expect(result.model).toContain('claude');
  });

  it('extracts JSON wrapped in ```json fences', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n{"items":[],"estimated_total_brl":null,"notes":"x"}\n```',
        },
      ],
      usage: {},
    });

    const result = await service.generateMaterialQuote(
      'reformar banheiro pequeno',
    );
    expect(result.items).toEqual([]);
    expect(result.notes).toBe('x');
  });

  it('throws when API key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    service = new AiService();
    await expect(
      service.generateMaterialQuote('qualquer descrição aqui'),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws when response text cannot be parsed as JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'não é json' }],
      usage: {},
    });
    await expect(
      service.generateMaterialQuote('descrição válida aqui'),
    ).rejects.toThrow(/Falha ao interpretar/);
  });

  it('throws when response has no text block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'image' }],
      usage: {},
    });
    await expect(
      service.generateMaterialQuote('descrição válida aqui'),
    ).rejects.toThrow(/não contém texto/);
  });
});
