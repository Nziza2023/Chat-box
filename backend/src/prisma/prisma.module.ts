import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() means we only need to import this once (in AppModule) and
// every other module can inject PrismaService without importing PrismaModule again.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
