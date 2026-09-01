import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class UserContext {
  userId: string;
  role: string;
  companyId: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
