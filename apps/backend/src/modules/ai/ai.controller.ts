import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { AiService } from './ai.service';

type GenerateQuoteBody = { description?: unknown };

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('v1/ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('material-quote')
  async generateMaterialQuote(@Body() body: GenerateQuoteBody) {
    const description =
      typeof body?.description === 'string' ? body.description.trim() : '';
    if (description.length < 10) {
      throw new BadRequestException(
        'Descrição muito curta — informe pelo menos 10 caracteres',
      );
    }
    if (description.length > 2000) {
      throw new BadRequestException(
        'Descrição muito longa — máximo 2000 caracteres',
      );
    }
    try {
      return await this.service.generateMaterialQuote(description);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('ANTHROPIC_API_KEY')) {
        throw new InternalServerErrorException('Serviço de IA não configurado');
      }
      throw new InternalServerErrorException(msg);
    }
  }
}
