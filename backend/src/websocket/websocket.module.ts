import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { PresenceService } from './presence.service';
import { MessagesModule } from '../messages/messages.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [JwtModule.register({}), MessagesModule, ConversationsModule, UsersModule],
  providers: [ChatGateway, PresenceService],
})
export class WebsocketModule {}
