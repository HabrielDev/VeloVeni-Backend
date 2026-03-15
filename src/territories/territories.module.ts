import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Territory } from './territory.entity';
import { TerritoryService } from './territory/territory.service';
import { TerritoryController } from './territory/territory.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Territory]), AuthModule],
  providers: [TerritoryService],
  controllers: [TerritoryController],
  exports: [TerritoryService],
})
export class TerritoriesModule {}
