import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { ClerkUser } from './auth/interfaces/clerk-user.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('auth/me')
  getMe(@CurrentUser() user: ClerkUser) {
    return user;
  }
}
