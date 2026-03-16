import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ActivityService } from '../activities/activity/activity.service';
import { UserService } from '../users/user/user.service';
import { AuthService } from '../auth/auth.service';
import { Activity } from '../activities/activity.entity';

interface StravaWebhookEvent {
  object_type: string;
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

@Injectable()
export class StravaWebhookService {
  private readonly logger = new Logger(StravaWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly activityService: ActivityService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
  ) {}

  verify(query: Record<string, string>): { 'hub.challenge': string } | null {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    const expectedToken = this.configService.get('STRAVA_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === expectedToken && challenge) {
      return { 'hub.challenge': challenge };
    }
    return null;
  }

  async handleEvent(event: StravaWebhookEvent): Promise<void> {
    if (event.object_type !== 'activity') return;

    const allUsers = await this.userService.findAll();
    const user = allUsers.find((u) => u.stravaId === String(event.owner_id)) ?? null;

    if (!user) {
      this.logger.log(`Webhook event for unknown athlete ${event.owner_id}, skipping`);
      return;
    }

    if (event.aspect_type === 'delete') {
      await this.activityRepo.delete({ stravaActivityId: String(event.object_id), userId: user.id });
      this.logger.log(`Deleted activity ${event.object_id} for user ${user.id}`);
      return;
    }

    if (event.aspect_type === 'create' || event.aspect_type === 'update') {
      try {
        const token = await this.authService.getValidStravaToken(user.id);
        await this.activityService.syncForUser(user.id, token);
        this.logger.log(`Synced activities for user ${user.id} (${event.aspect_type}: ${event.object_id})`);
      } catch (err) {
        this.logger.error(`Webhook sync failed for user ${user.id}: ${String(err)}`);
      }
    }
  }
}
