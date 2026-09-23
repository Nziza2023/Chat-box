import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ReactMessageDto } from './dto/react-message.dto';

// Note: sending a message normally happens over the WebSocket gateway so it
// reaches the other user instantly. This REST endpoint exists as a fallback
// (and for anything hitting the API outside a live socket connection) and
// uses the exact same MessagesService method, so behavior never diverges.
@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversations/:id/messages')
  getHistory(
    @Param('id') conversationId: string,
    @CurrentUser() user: { userId: string },
    @Query('cursor') cursor?: string,
  ) {
    return this.messagesService.getHistory(conversationId, user.userId, cursor);
  }

  @Post('messages')
  send(@CurrentUser() user: { userId: string }, @Body() dto: SendMessageDto) {
    return this.messagesService.send(user.userId, dto);
  }

  @Patch('messages/:id')
  edit(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: EditMessageDto,
  ) {
    return this.messagesService.edit(user.userId, id, dto.content);
  }

  @Delete('messages/:id')
  delete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.messagesService.deleteForEveryone(user.userId, id);
  }

  @Post('messages/:id/react')
  react(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: ReactMessageDto,
  ) {
    return this.messagesService.react(user.userId, id, dto);
  }

  @Post('conversations/:id/read')
  markRead(@Param('id') conversationId: string, @CurrentUser() user: { userId: string }) {
    return this.messagesService.markConversationRead(user.userId, conversationId);
  }
}
