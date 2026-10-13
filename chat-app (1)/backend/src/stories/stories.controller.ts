import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';

@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private storiesService: StoriesService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.storiesService.listForUser(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateStoryDto) {
    return this.storiesService.create(user.userId, dto);
  }

  @Post(':id/view')
  view(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.storiesService.view(user.userId, id);
  }

  @Get(':id/viewers')
  getViewers(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.storiesService.getViewers(user.userId, id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.storiesService.delete(user.userId, id);
  }
}
