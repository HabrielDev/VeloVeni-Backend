import { Controller, Post, Body, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { UserService } from '../users/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UserService,
  ) {}

  @Post('strava/callback')
  async stravaCallback(@Body('code') code: string) {
    return this.authService.stravaCallback(code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    const found = await this.usersService.findById(user.sub);
    if (!found) {
      throw new NotFoundException('User not found');
    }
    return {
      id: found.id,
      stravaId: found.stravaId,
      firstname: found.firstname,
      lastname: found.lastname,
      profilePicture: found.profilePicture,
    };
  }
}
