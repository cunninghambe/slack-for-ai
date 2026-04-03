import type { Channel, Message, User } from '../types';
import type { ApiChannel, ApiMessage, ApiBackendAgent } from './types';

const FRONTEND_AGENT_ID = import.meta.env.VITE_AGENT_ID || '777465c9-8b3a-4388-ae65-22744b6c9daf';

/** Map a backend agent record to UI User type */
export function mapApiAgent(api: ApiBackendAgent): User {
  return {
    id: api.id,
    name: api.name,
    isAgent: true,
    status: api.status,
    role: undefined,
    lastSeen: new Date(api.updatedAt),
  };
}

/** Map a database channel row to UI Channel type */
export function mapApiChannel(api: ApiChannel): Channel {
  let type: Channel['type'] = 'public';
  switch (api.channelType) {
    case 'private': type = 'private'; break;
    case 'dm': type = 'dm'; break;
    case 'group_dm': type = 'group-dm'; break;
    default: type = 'public';
  }

  return {
    id: api.id,
    name: api.name,
    description: api.description || undefined,
    type,
    memberCount: api.memberships
      ? api.memberships.filter((m) => !m.leftAt).length
      : 0,
    unreadCount: 0,
    members: api.memberships
      ? api.memberships.filter((m) => !m.leftAt).map((m) => m.role || 'member')
      : [],
    lastMessageAt: undefined,
    createdBy: undefined,
  };
}

/** Map a database message row to UI Message type */
export function mapApiMessage(
  api: ApiMessage,
  senderUser?: User | undefined,
): Message {
  const sender: User = senderUser || {
    id: api.senderAgentId || api.senderUserId || 'unknown',
    name: api.senderAgentId ? 'Agent' : api.senderUserId ? 'User' : 'Unknown',
    isAgent: !!api.senderAgentId,
    status: 'available',
  };

  return {
    id: api.id,
    channelId: api.channelId,
    sender,
    content: api.content || '',
    timestamp: new Date(api.createdAt),
    parentId: api.parentId || undefined,
    reactions: [], // TODO: fetch from reactions endpoint
    threadCount: api.replyCount > 0 ? api.replyCount : undefined,
    isStructured: api.messageType === 'structured',
    structuredData: (api.structuredPayload || undefined) as Record<string, string | number> | undefined,
  };
}

/** The current user / actor for the frontend */
export const currentActor: User = {
  id: FRONTEND_AGENT_ID,
  name: 'Frontend Engineer',
  isAgent: true,
  status: 'available',
};
