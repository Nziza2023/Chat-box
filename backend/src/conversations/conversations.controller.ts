import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.conversationsService.listForUser(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateConversationDto) {
    return this.conversationsService.findOrCreateDirect(user.userId, dto.targetUserId);
  }

  @Patch(':id/pin')
  togglePin(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.conversationsService.togglePin(id, user.userId);
  }

  @Patch(':id/mute')
  toggleMute(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.conversationsService.toggleMute(id, user.userId);
  }

  @Delete(':id/history')
  clearHistory(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.conversationsService.clearHistory(id, user.userId);
  }
}
