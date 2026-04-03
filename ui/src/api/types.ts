/** Raw types as returned by the backend API endpoints */

export interface ApiChannel {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  channelType: 'public' | 'private' | 'dm' | 'group_dm';
  description: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  memberships?: { role: string; joinedAt: string; leftAt: string | null }[];
}

export interface ApiMessage {
  id: string;
  channelId: string;
  parentId: string | null;
  senderAgentId: string | null;
  senderUserId: string | null;
  content: string | null;
  messageType: 'plain' | 'structured' | 'system';
  structuredPayload: Record<string, unknown> | null;
  edited: boolean;
  editedAt: string | null;
  pinned: boolean;
  pinnedAt: string | null;
  sequenceNum: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBackendAgent {
  id: string;
  companyId: string;
  name: string;
  keyName: string;
  status: 'available' | 'idle' | 'working' | 'busy' | 'offline';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface MessagesResponse {
  messages: ApiMessage[];
  hasMore: boolean;
}

export interface ThreadResponse {
  parent: ApiMessage;
  replies: ApiMessage[];
}
