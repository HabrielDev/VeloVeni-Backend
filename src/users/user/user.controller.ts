import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me/privacy')
  async getPrivacy(@CurrentUser() user: JwtPayload) {
    return this.userService.getPrivacySettings(user.sub);
  }

  @Patch('me/privacy')
  async updatePrivacy(
    @CurrentUser() user: JwtPayload,
    @Body() body: { shareZones?: boolean; shareRides?: boolean },
  ) {
    await this.userService.updatePrivacySettings(user.sub, body);
    return { ok: true };
  }
}
