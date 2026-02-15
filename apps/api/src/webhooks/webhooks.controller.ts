import {
  Controller,
  Post,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from 'svix';
import { Public } from '../common/decorators/public.decorator';
import { OrganizationsService } from '../organizations/organizations.service';

@Controller('webhooks')
export class WebhooksController {
  private logger = new Logger(WebhooksController.name);
  private wh: Webhook;

  constructor(private organizationsService: OrganizationsService) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('CLERK_WEBHOOK_SECRET env var is not set');
    }
    this.wh = new Webhook(secret);
  }

  @Public()
  @Post('clerk')
  async handleClerkWebhook(@Req() req: Request) {
    try {
      const payload = (req as any).rawBody?.toString('utf8');
      if (!payload) {
        throw new BadRequestException('Missing request body');
      }

      const event = this.wh.verify(payload, {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      }) as { type: string; data: { id: string; name: string } };

      this.logger.log(`Received webhook event: ${event.type}`);

      if (event.type === 'organization.created') {
        const clerkOrgId = event.data.id;
        const orgName = event.data.name;

        this.logger.log(
          `Creating organization: ${clerkOrgId} (${orgName})`,
        );

        await this.organizationsService.provisionOrganization(
          clerkOrgId,
          orgName,
        );
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook verification failed: ${errorMessage}`);
      throw new BadRequestException('Webhook verification failed');
    }
  }
}
