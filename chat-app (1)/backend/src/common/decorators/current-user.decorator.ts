import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Lets us write `@CurrentUser() user` as a controller parameter instead of
// digging into the raw request object every time.
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as { userId: string; username: string };
});
