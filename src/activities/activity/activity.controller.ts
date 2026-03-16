import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';
import { AuthService } from '../../auth/auth.service';
import { GetRouteDto } from './get-route.dto';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly authService: AuthService,
  ) {}

  @Post('recalculate')
  async recalculate(@CurrentUser() user: JwtPayload) {
    await this.activityService.recalculateForUserFromDb(user.sub);
    return { ok: true };
  }

  @Post('sync')
  async sync(@CurrentUser() user: JwtPayload) {
    const stravaToken = await this.authService.getValidStravaToken(user.sub);
    const synced = await this.activityService.syncForUser(user.sub, stravaToken);
    return { synced };
  }

  @Get('friends')
  async getFriendsActivities(@CurrentUser() user: JwtPayload) {
    const stravaToken = await this.authService.getValidStravaToken(user.sub);
    return this.activityService.getFriendsActivities(user.sub, stravaToken);
  }

  @Get()
  async getAll(@CurrentUser() user: JwtPayload) {
    return this.activityService.getForUser(user.sub);
  }

  @Get(':stravaId/route')
  async getRoute(@CurrentUser() user: JwtPayload, @Param() params: GetRouteDto) {
    const stravaToken = await this.authService.getValidStravaToken(user.sub);
    return this.activityService.getRoute(user.sub, params.stravaId, stravaToken);
  }
}
