import { Global, Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';

// @Global so every module can inject AuthorizationService without importing
// this module everywhere — same pattern as PrismaModule.
@Global()
@Module({
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
