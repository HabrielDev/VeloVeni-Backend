import { Controller, Post, Body, Get, Delete, UseGuards, NotFoundException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

  // Stricter rate limit on auth endpoint: 10 attempts per minute
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('strava/callback')
  async stravaCallback(@Body('code') code: string) {
    return this.authService.stravaCallback(code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    const found = await this.usersService.findById(user.sub);
    if (!found) throw new NotFoundException('User not found');
    return {
      id: found.id,
      stravaId: found.stravaId,
      firstname: found.firstname,
      lastname: found.lastname,
      profilePicture: found.profilePicture,
    };
  }

  // DSGVO Art. 20 — Datenexport
  @Get('export')
  @UseGuards(JwtAuthGuard)
  async exportData(@CurrentUser() user: JwtPayload) {
    return this.usersService.exportData(user.sub);
  }

  // DSGVO Art. 17 — Account + alle Daten löschen
  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@CurrentUser() user: JwtPayload) {
    await this.usersService.deleteAccount(user.sub);
    return { message: 'Account und alle Daten wurden gelöscht.' };
  }
}
