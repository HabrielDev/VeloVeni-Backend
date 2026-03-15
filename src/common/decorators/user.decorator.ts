import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Must be a class (not interface) for emitDecoratorMetadata compatibility
export class JwtPayload {
  sub: number;
  stravaId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
