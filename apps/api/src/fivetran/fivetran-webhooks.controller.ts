import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../common/decorators/public.decorator';
import { FivetranService } from './fivetran.service';

@Controller('webhooks')
export class FivetranWebhooksController {
  private readonly logger = new Logger(FivetranWebhooksController.name);
  private readonly secret: string;

  constructor(
    private readonly fivetran: FivetranService,
    private readonly configService: ConfigService,
  ) {
    this.secret = this.configService.get<string>('FIVETRAN_WEBHOOK_SECRET')!;
  }

  @Public()
  @Post('fivetran')
  async handle(@Req() req: Request) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) throw new BadRequestException('Missing request body');

    const signatureHeader =
      (req.headers['x-fivetran-signature'] as string | undefined) ||
      (req.headers['X-Fivetran-Signature'] as unknown as string | undefined);
    if (!signatureHeader) throw new UnauthorizedException('Missing signature');

    const expected = createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex');

    const provided = signatureHeader.replace(/^sha256=/, '');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid signature');
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid JSON');
    }

    this.fivetran
      .handleWebhook(event as Parameters<FivetranService['handleWebhook']>[0])
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Fivetran webhook processing failed: ${message}`,
          error instanceof Error ? error.stack : undefined,
        );
      });

    return { success: true };
  }
}