import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Activity } from '../activities/activity.entity';
import { Territory } from '../territories/territory.entity';
import { TileCrossing } from '../territories/tile-crossing.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cs: ConfigService) => ({
        type: 'postgres',
        host: cs.get('DB_HOST') ?? 'localhost',
        port: parseInt(cs.get('DB_PORT') ?? '5432'),
        username: cs.get('DB_USERNAME') ?? 'postgres',
        password: cs.get('DB_PASSWORD'),
        database: cs.get('DB_DATABASE') ?? 'veloveni_db',
        entities: [User, Activity, Territory, TileCrossing],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Activity, Territory, TileCrossing]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
