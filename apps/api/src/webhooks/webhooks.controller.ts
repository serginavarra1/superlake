import {
  Controller,
  Post,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Webhook } from 'svix';
import { Public } from '../common/decorators/public.decorator';
import { OrganizationsService } from '../organizations/organizations.service';

interface ClerkWebhookEvent {
  type: string;
  data: { id: string; name: string };
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly wh: Webhook;

  constructor(
    private organizationsService: OrganizationsService,
    private configService: ConfigService,
  ) {
    this.wh = new Webhook(
      this.configService.get<string>('CLERK_WEBHOOK_SECRET')!,
    );
  }

  @Public()
  @Post('clerk')
  async handleClerkWebhook(@Req() req: Request) {
    const event = this.verifyWebhook(req);

    this.logger.log(`Received webhook event: ${event.type}`);

    // Process event asynchronously — respond 200 to Clerk immediately
    this.processEvent(event).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process webhook event ${event.type}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    });

    return { success: true };
  }

  private verifyWebhook(req: Request): ClerkWebhookEvent {
    const payload = (req as Request & { rawBody?: Buffer }).rawBody?.toString(
      'utf8',
    );
    if (!payload) {
      throw new BadRequestException('Missing request body');
    }

    try {
      return this.wh.verify(payload, {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      }) as ClerkWebhookEvent;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook verification failed: ${errorMessage}`);
      throw new BadRequestException('Webhook verification failed');
    }
  }

  private async processEvent(event: ClerkWebhookEvent): Promise<void> {
    switch (event.type) {
      case 'organization.created': {
        const { id: clerkOrgId, name: orgName } = event.data;
        await this.organizationsService.provisionOrganization(
          clerkOrgId,
          orgName,
        );
        break;
      }
      case 'organization.deleted': {
        const { id: clerkOrgId } = event.data;
        await this.organizationsService.deprovisionOrganization(clerkOrgId);
        break;
      }
      default:
        this.logger.warn(`Unhandled webhook event: ${event.type}`);
    }
  }
}