import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Activity } from '../activities/activity.entity';
import { Territory } from '../territories/territory.entity';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Activity, Territory])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UsersModule {}
