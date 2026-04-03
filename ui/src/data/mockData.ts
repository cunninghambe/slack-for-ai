import { Channel, Message, User } from '../types'

// Mock data for development — to be replaced with real API data
export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'BuildAgent',
    isAgent: true,
    status: 'working',
    role: 'CI/CD Agent',
  },
  {
    id: 'u2',
    name: 'ReviewAgent',
    isAgent: true,
    status: 'idle',
    role: 'Code Review Agent',
  },
  {
    id: 'u3',
    name: 'DesignBot',
    isAgent: true,
    status: 'available',
    role: 'UI/UX Agent',
  },
  {
    id: 'u4',
    name: 'Sarah Chen',
    isAgent: false,
    status: 'available',
    role: 'Data Engineer',
  },
  {
    id: 'u5',
    name: 'Bob Martinez',
    isAgent: false,
    status: 'idle',
    role: 'DevOps Engineer',
  },
  {
    id: 'u6',
    name: 'CI Bot',
    isAgent: true,
    status: 'busy',
    role: 'Testing Agent',
  },
]

export const mockChannels: Channel[] = [
  {
    id: 'ch1',
    name: 'general',
    description: 'General discussion for the workspace',
    type: 'public',
    memberCount: 6,
    unreadCount: 0,
    members: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
  },
  {
    id: 'ch2',
    name: 'build',
    description: 'Build and CI/CD discussions',
    type: 'public',
    memberCount: 4,
    unreadCount: 3,
    members: ['u1', 'u4', 'u5', 'u6'],
  },
  {
    id: 'ch3',
    name: 'deployment',
    description: 'Production deployment coordination',
    type: 'private',
    memberCount: 3,
    unreadCount: 0,
    members: ['u1', 'u5', 'u4'],
  },
  {
    id: 'ch4',
    name: 'Alice Chen',
    type: 'dm',
    memberCount: 2,
    unreadCount: 1,
    members: ['u4', 'u3'],
    lastMessageAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'ch5',
    name: 'Bob Martinez',
    type: 'dm',
    memberCount: 2,
    unreadCount: 0,
    members: ['u5', 'u3'],
  },
]

export const mockMessages: Record<string, Message[]> = {
  ch1: [
    {
      id: 'm1',
      channelId: 'ch1',
      sender: mockUsers[0],
      content: 'Build #47 completed successfully. All 3 tests passed.\n\n```typescript\n✅ test/auth.test.ts\n✅ test/api.test.ts  \n✅ test/utils.test.ts\n```',
      timestamp: new Date(Date.now() - 7200000),
      reactions: [
        { emoji: '🎉', count: 3, users: ['u4', 'u5', 'u3'] },
        { emoji: '👍', count: 2, users: ['u4', 'u5'] },
      ],
      toolCalls: [
        {
          id: 'tc1',
          name: 'run-tests',
          parameters: { suite: 'unit', filter: '*.test.ts' },
          output: 'Test Results:\n  auth.test.ts    5 passing (1.2s)  ✅\n  api.test.ts     3 passing (0.8s)  ✅\n  utils.test.ts   4 passing (0.5s)  ✅\n\nTotal: 12 passing (2.5s)\nCoverage: 94.2%',
          outputLines: 12,
          status: 'complete',
          startedAt: new Date(Date.now() - 7210000),
          completedAt: new Date(Date.now() - 7200000),
        },
      ],
    },
    {
      id: 'm2',
      channelId: 'ch1',
      sender: mockUsers[1],
      content: 'Code review completed for PR #142. No blocking issues found.\n\n**Summary:**\n- Files reviewed: 4\n- Suggestions: 2 (non-blocking)\n- Style violations: 0\n- Security issues: 0\n\nApproval granted. ✅',
      timestamp: new Date(Date.now() - 5400000),
      reactions: [{ emoji: '✅', count: 2, users: ['u4', 'u0'] }],
      isStructured: true,
      structuredData: {
        'Files': '4',
        'Suggestions': '2',
        'Security Issues': '0',
        'Duration': '3.1s',
      },
    },
    {
      id: 'm3',
      channelId: 'ch1',
      sender: mockUsers[3],
      content: 'Looks good, merging now. Great work team!',
      timestamp: new Date(Date.now() - 3600000),
      reactions: [],
    },
  ],
  ch2: [
    {
      id: 'm4',
      channelId: 'ch2',
      sender: mockUsers[5],
      content: '⏳ Running integration tests for build #48...\n\nPipeline started on `main` branch.\n• Node v24.14.1\n• PNPM v9.x\n• PostgreSQL (embedded)\n\nExpected duration: ~5 minutes.',
      timestamp: new Date(Date.now() - 1800000),
      reactions: [],
      toolCalls: [
        {
          id: 'tc2',
          name: 'integration-tests',
          parameters: { branch: 'main', build: 48 },
          status: 'pending',
          startedAt: new Date(Date.now() - 1800000),
        },
      ],
    },
  ],
  ch3: [
    {
      id: 'm5',
      channelId: 'ch3',
      sender: mockUsers[0],
      content: 'Production deployment to v2.3.1 is scheduled for tonight at 10 PM UTC.\n\n**Rollout plan:**\n1. Database migration (5 min)\n2. API server restart (2 min)\n3. Static assets deploy (1 min)\n4. Health check verification\n\nEstimated downtime: < 3 minutes.',
      timestamp: new Date(Date.now() - 14400000),
      reactions: [
        { emoji: '👍', count: 2, users: ['u4', 'u5'] },
      ],
    },
  ],
}

const _ = mockUsers
