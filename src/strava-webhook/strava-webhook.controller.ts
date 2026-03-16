/**
 * Strava Webhook Controller
 *
 * Nach dem Deploy die Subscription einmalig registrieren:
 *
 * curl -X POST https://www.strava.com/api/v3/push_subscriptions \
 *   -d client_id=<STRAVA_CLIENT_ID> \
 *   -d client_secret=<STRAVA_CLIENT_SECRET> \
 *   -d callback_url=https://<BACKEND_URL>/strava/webhook \
 *   -d verify_token=<STRAVA_WEBHOOK_VERIFY_TOKEN>
 *
 * Subscription prüfen:
 * curl -G https://www.strava.com/api/v3/push_subscriptions \
 *   -d client_id=<STRAVA_CLIENT_ID> \
 *   -d client_secret=<STRAVA_CLIENT_SECRET>
 */
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StravaWebhookService } from './strava-webhook.service';

@SkipThrottle()
@Controller('strava/webhook')
export class StravaWebhookController {
  constructor(private readonly webhookService: StravaWebhookService) {}

  // Strava ruft diesen Endpoint auf, um die Subscription zu verifizieren
  @Get()
  verify(@Query() query: Record<string, string>) {
    const response = this.webhookService.verify(query);
    if (!response) throw new ForbiddenException('Invalid verify token');
    return response;
  }

  // Strava sendet hier Events bei neuen/geänderten/gelöschten Aktivitäten
  @Post()
  @HttpCode(HttpStatus.OK)
  handleEvent(@Body() event: Record<string, unknown>) {
    // Sofort 200 zurückgeben, Verarbeitung asynchron
    void this.webhookService.handleEvent(event as unknown as Parameters<StravaWebhookService['handleEvent']>[0]);
    return {};
  }
}
