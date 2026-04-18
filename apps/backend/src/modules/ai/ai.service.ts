import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export type MaterialItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

export type MaterialQuote = {
  items: MaterialItem[];
  estimated_total_brl: number | null;
  notes: string;
  model: string;
};

const SYSTEM_PROMPT = `Você é um assistente especialista em materiais de construção civil no Brasil.
Dado uma descrição de obra/reforma em português, gere uma lista detalhada de materiais necessários.

Responda APENAS com JSON válido no formato:
{
  "items": [
    { "name": string, "quantity": number, "unit": "un" | "kg" | "m" | "m2" | "m3" | "l" | "saco", "category": "hidraulica" | "eletrica" | "pintura" | "alvenaria" | "revestimento" | "acabamento" | "outros" }
  ],
  "estimated_total_brl": number or null,
  "notes": string (observações adicionais para o profissional)
}

Use quantidades realistas. Se não tiver certeza do preço, use null em estimated_total_brl.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'ANTHROPIC_API_KEY não configurada — IA não disponível',
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async generateMaterialQuote(description: string): Promise<MaterialQuote> {
    const client = this.getClient();
    const model = 'claude-haiku-4-5-20251001';

    this.logger.log({
      event: 'ai.generate_material_quote.start',
      description_length: description.length,
      model,
    });

    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Descrição da obra:\n\n${description}\n\nGere a lista de materiais em JSON.`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== 'text') {
      throw new Error('Resposta da IA não contém texto');
    }

    let parsed: Omit<MaterialQuote, 'model'>;
    try {
      const json = extractJson(block.text);
      parsed = JSON.parse(json) as Omit<MaterialQuote, 'model'>;
    } catch (err) {
      this.logger.error({
        event: 'ai.generate_material_quote.parse_error',
        error: (err as Error).message,
        raw: block.text.slice(0, 500),
      });
      throw new Error('Falha ao interpretar resposta da IA');
    }

    this.logger.log({
      event: 'ai.generate_material_quote.done',
      items_count: parsed.items?.length ?? 0,
      tokens: response.usage,
    });

    return { ...parsed, model };
  }
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }
  return text.trim();
}
