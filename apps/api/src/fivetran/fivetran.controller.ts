import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';
import { FivetranService } from './fivetran.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

@Controller('fivetran')
export class FivetranController {
  constructor(private readonly fivetran: FivetranService) {}

  @Get('services')
  async listServices(
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ) {
    let limit = 100;
    if (limitRaw !== undefined) {
      const parsed = Number(limitRaw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
        throw new BadRequestException('limit must be an integer between 1 and 1000');
      }
      limit = parsed;
    }
    return this.fivetran.listServices({ limit, cursor });
  }

  @Get('connections')
  async listConnections(@CurrentUser() user: ClerkUser) {
    return this.fivetran.listConnections(user.orgId!);
  }

  @Post('connections')
  @HttpCode(HttpStatus.CREATED)
  async createConnection(
    @CurrentUser() user: ClerkUser,
    @Body() dto: CreateConnectionDto,
  ) {
    return this.fivetran.createConnection(user.orgId!, user.userId, dto);
  }

  @Post('connections/:id/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizeConnection(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
  ) {
    return this.fivetran.finalizeConnection(user.orgId!, id);
  }

  @Post('connections/:id/sync')
  @HttpCode(HttpStatus.OK)
  async syncConnection(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
  ) {
    return this.fivetran.triggerSync(user.orgId!, id);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConnection(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
  ) {
    await this.fivetran.deleteConnection(user.orgId!, id);
  }
}
