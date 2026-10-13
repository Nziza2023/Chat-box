import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoryDto) {
    return this.prisma.story.create({
      data: {
        userId,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        caption: dto.caption,
        expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
      },
    });
  }

  // Returns stories grouped by author, but only for the current user and
  // people they actually have a conversation with — this is what keeps
  // Stories from becoming a public feed of strangers' uploads.
  async listForUser(userId: string) {
    const contactIds = await this.getContactIds(userId);
    const authorIds = [userId, ...contactIds];

    const stories = await this.prisma.story.findMany({
      where: {
        userId: { in: authorIds },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        views: { where: { userId }, select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, { user: any; stories: any[]; hasUnseen: boolean }>();
    for (const story of stories) {
      const entry = grouped.get(story.userId) ?? { user: story.user, stories: [], hasUnseen: false };
      const seen = story.views.length > 0;
      entry.stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        seen,
      });
      if (!seen && story.userId !== userId) entry.hasUnseen = true;
      grouped.set(story.userId, entry);
    }

    // Put "your story" first, then unseen contacts, then already-seen ones
    return Array.from(grouped.values()).sort((a, b) => {
      if (a.user.id === userId) return -1;
      if (b.user.id === userId) return 1;
      return a.hasUnseen === b.hasUnseen ? 0 : a.hasUnseen ? -1 : 1;
    });
  }

  async view(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.expiresAt < new Date()) throw new NotFoundException('Story not found');

    const contactIds = await this.getContactIds(userId);
    if (story.userId !== userId && !contactIds.includes(story.userId)) {
      throw new ForbiddenException("You don't have a conversation with this person");
    }

    await this.prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      create: { storyId, userId },
      update: {},
    });

    return { success: true };
  }

  // Lets the story's own author see who viewed it — a real feature since we
  // actually track views, not a fabricated count.
  async getViewers(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.userId !== userId) {
      throw new ForbiddenException('Only the author can see who viewed this story');
    }
    return this.prisma.storyView.findMany({
      where: { storyId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { viewedAt: 'desc' },
    });
  }

  async delete(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.userId !== userId) throw new ForbiddenException('You can only delete your own story');
    await this.prisma.story.delete({ where: { id: storyId } });
    return { success: true };
  }

  private async getContactIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      select: {
        conversation: {
          select: {
            members: { where: { userId: { not: userId } }, select: { userId: true } },
          },
        },
      },
    });
    const ids = new Set<string>();
    memberships.forEach((m) => m.conversation.members.forEach((mem) => ids.add(mem.userId)));
    return Array.from(ids);
  }
}
