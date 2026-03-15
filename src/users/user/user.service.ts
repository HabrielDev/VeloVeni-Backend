import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async upsertFromStrava(stravaData: {
    athlete: { id: number; firstname: string; lastname: string; profile: string };
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }): Promise<User> {
    const { athlete, access_token, refresh_token, expires_at } = stravaData;
    const stravaId = String(athlete.id);

    let user = await this.userRepo.findOne({ where: { stravaId } });
    const expiresAt = new Date(expires_at * 1000);

    if (user) {
      user.stravaAccessToken = access_token;
      user.stravaRefreshToken = refresh_token;
      user.stravaTokenExpiresAt = expiresAt;
      user.firstname = athlete.firstname;
      user.lastname = athlete.lastname;
      user.profilePicture = athlete.profile;
    } else {
      user = this.userRepo.create({
        stravaId,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        profilePicture: athlete.profile,
        stravaAccessToken: access_token,
        stravaRefreshToken: refresh_token,
        stravaTokenExpiresAt: expiresAt,
      });
    }
    return this.userRepo.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async updateStravaToken(
    userId: number,
    token: { access_token: string; refresh_token: string; expires_at: number },
  ): Promise<void> {
    await this.userRepo.update(userId, {
      stravaAccessToken: token.access_token,
      stravaRefreshToken: token.refresh_token,
      stravaTokenExpiresAt: new Date(token.expires_at * 1000),
    });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }
}
