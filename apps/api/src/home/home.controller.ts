import { Controller, Get } from '@nestjs/common';
import { HomeService } from './home.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getStats(@CurrentUser() user: ClerkUser) {
    return this.homeService.getStats(user.orgId!, user.userId);
  }
}
