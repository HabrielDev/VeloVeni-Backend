import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async stravaCallback(code: string) {
    const stravaData = await this.exchangeStravaCode(code);
    if (!stravaData.athlete) throw new UnauthorizedException('Invalid Strava response');

    const user = await this.usersService.upsertFromStrava(stravaData);

    const payload = { sub: user.id, stravaId: user.stravaId };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      strava_access_token: stravaData.access_token,
      // strava_refresh_token is intentionally omitted — stored server-side only
      strava_expires_at: stravaData.expires_at,
      athlete: {
        id: stravaData.athlete.id,
        firstname: stravaData.athlete.firstname,
        lastname: stravaData.athlete.lastname,
        profile: stravaData.athlete.profile,
      },
    };
  }

  private async exchangeStravaCode(code: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.configService.get('STRAVA_CLIENT_ID'),
        client_secret: this.configService.get('STRAVA_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${frontendUrl}/strava/callback`,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new UnauthorizedException(`Strava token exchange failed: ${err}`);
    }
    return res.json();
  }

  async refreshStravaToken(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.configService.get('STRAVA_CLIENT_ID'),
        client_secret: this.configService.get('STRAVA_CLIENT_SECRET'),
        refresh_token: user.stravaRefreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new Error('Token refresh failed');
    const data = await res.json();

    await this.usersService.updateStravaToken(userId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });
    return data.access_token as string;
  }

  async getValidStravaToken(userId: number): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    const expiresAt = user.stravaTokenExpiresAt?.getTime() ?? 0;
    if (Date.now() < expiresAt - 300_000) return user.stravaAccessToken;
    return this.refreshStravaToken(userId);
  }
}
