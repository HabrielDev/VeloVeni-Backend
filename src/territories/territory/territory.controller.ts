import { Controller, Get, UseGuards } from '@nestjs/common';
import { TerritoryService } from './territory.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';
import { AuthService } from '../../auth/auth.service';

@Controller('territories')
@UseGuards(JwtAuthGuard)
export class TerritoryController {
  constructor(
    private readonly territoryService: TerritoryService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  async getMyTerritories(@CurrentUser() user: JwtPayload) {
    const territory = await this.territoryService.getForUser(user.sub);
    if (!territory) return { userId: user.sub, tiles: [], tileCount: 0, areaKm2: 0, color: '#FC4C02' };
    return {
      userId: territory.userId,
      color: territory.color,
      tileCount: territory.tileCount,
      areaKm2: territory.areaKm2,
      tiles: territory.tiles ?? [],
    };
  }

  @Get('tiles/crossings')
  async getTileCrossings() {
    return this.territoryService.getTileCrossings();
  }

  @Get('friends')
  async getFriendsTerritories(@CurrentUser() user: JwtPayload) {
    const stravaToken = await this.authService.getValidStravaToken(user.sub);
    const territories = await this.territoryService.getFriendsTerritories(user.sub, stravaToken);
    return territories.map((t) => ({
      userId: t.userId,
      firstname: t.user?.firstname ?? '',
      lastname: t.user?.lastname ?? '',
      color: t.color,
      tileCount: t.tileCount,
      areaKm2: t.areaKm2,
      tiles: t.tiles ?? [],
    }));
  }

  @Get('all')
  async getAllTerritories(@CurrentUser() user: JwtPayload) {
    const territories = await this.territoryService.getAllWithPrivacy(user.sub);
    return territories.map((t) => ({
      userId: t.userId,
      firstname: t.user?.firstname ?? '',
      lastname: t.user?.lastname ?? '',
      color: t.color,
      tileCount: t.tileCount,
      areaKm2: t.areaKm2,
      tiles: t.tiles ?? [],
    }));
  }
}
