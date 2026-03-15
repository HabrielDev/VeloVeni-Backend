import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Territory } from './territory.entity';
import { TileCrossing } from './tile-crossing.entity';
import { TerritoryService } from './territory/territory.service';
import { TerritoryController } from './territory/territory.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Territory, TileCrossing]), AuthModule],
  providers: [TerritoryService],
  controllers: [TerritoryController],
  exports: [TerritoryService],
})
export class TerritoriesModule {}
