import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// This service wraps Prisma's client so it plugs into NestJS's lifecycle.
// It connects to the database when the app starts, and disconnects cleanly
// when the app shuts down. Every other module injects this instead of
// creating its own PrismaClient.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
