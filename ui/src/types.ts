export interface FileAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  output?: string;
  outputLines?: number;
  status: 'pending' | 'complete' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
}

export interface Message {
  id: string;
  channelId: string;
  sender: User;
  content: string;
  timestamp: Date;
  parentId?: string;
  reactions: Reaction[];
  toolCalls?: ToolCall[];
  isStructured?: boolean;
  structuredData?: Record<string, string | number>;
  threadCount?: number;
  attachments?: FileAttachment[];
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'dm' | 'group-dm';
  memberCount: number;
  unreadCount: number;
  lastMessageAt?: Date;
  members: string[];
  createdBy?: string;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  isAgent: boolean;
  status: 'available' | 'idle' | 'working' | 'busy' | 'offline';
  role?: string;
  lastSeen?: Date;
}
