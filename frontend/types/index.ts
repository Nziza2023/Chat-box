export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
  email?: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM';

export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

export interface Reaction {
  id: string;
  emoji: string;
  user: { id: string; username: string };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  content: string | null;
  messageType: MessageType;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string | null;
    sender: { id: string; username: string; displayName: string };
  } | null;
  isDeleted: boolean;
  editedAt?: string | null;
  createdAt: string;
  attachments: Attachment[];
  reactions: Reaction[];
  // client-only, used while a message is being sent
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ConversationSummary {
  id: string;
  type: 'DIRECT' | 'GROUP';
  isPinned: boolean;
  isMuted: boolean;
  otherUser: PublicUser | null;
  lastMessage: {
    content: string | null;
    messageType: MessageType;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}
