import { Controller, Get, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';
import { AuthService } from '../../auth/auth.service';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(
    private readonly leaderboardService: LeaderboardService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  getLeaderboard() {
    return this.leaderboardService.getLeaderboard();
  }

  @Get('friends')
  async getFriendsLeaderboard(@CurrentUser() user: JwtPayload) {
    const stravaToken = await this.authService.getValidStravaToken(user.sub);
    return this.leaderboardService.getFriendsLeaderboard(user.sub, stravaToken);
  }
}
