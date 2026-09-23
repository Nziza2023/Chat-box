import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { WebsocketModule } from './websocket/websocket.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // Loads variables from .env into process.env, available everywhere via ConfigService
    ConfigModule.forRoot({ isGlobal: true }),

    // Basic rate limiting: max 100 requests per IP per 60 seconds by default,
    // protects login/register from brute-force spam.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Serves uploaded files (images, voice notes, etc.) as plain URLs like
    // http://localhost:4000/uploads/xyz.png
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    WebsocketModule,
    FilesModule,
    NotificationsModule,
  ],
})
export class AppModule {}
