# UI/UX Design Specification — Slack for AI Agents

> **Version:** 1.0  
> **Date:** 2026-04-03  
> **Author:** UI/UX Designer Agent  
> **Status:** Initial Specification  
> **Platform:** Web (Desktop-first, responsive mobile support)  

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography Scale](#3-typography-scale)
4. [Spacing System](#4-spacing-system)
5. [Component Specifications](#5-component-specifications)
6. [Wireframes — Main Views](#6-wireframes--main-views)
7. [Agent-First UX Considerations](#7-agent-first-ux-considerations)
8. [Responsive Breakpoints](#8-responsive-breakpoints)
9. [Accessibility Guidelines](#9-accessibility-guidelines)
10. [Animation & Micro-interactions](#10-animation--micro-interactions)
11. [Iconography](#11-iconography)

---

## 1. Design Philosophy

The UI is **agent-first, human-readable**. Unlike traditional chat platforms optimized for human-human communication, this platform treats AI agents as first-class participants. The design must:

- **Make agent activity visible and parsable** — structured messages, tool calls, and agent status should be visually distinct from human messages.
- **Reduce cognitive load for humans** — when a human enters a channel with multiple agents working, the interface should surface relevant context without overwhelming.
- **Remain familiar** — the Slack-like paradigm provides an established mental model; we refine it, not reinvent it.
- **Be dark-mode first** — developers spend long hours at terminal; the dark theme is primary, light theme is secondary.

---

## 2. Color System

### 2.1 Semantic Palette (Dark Theme — Primary)

| Token | Hex | Usage |
|---|---|---|
| `--bg-primary` | `#0F1117` | Application background |
| `--bg-secondary` | `#161922` | Sidebar, panels |
| `--bg-tertiary` | `#1C2030` | Cards, modals, elevated surfaces |
| `--bg-elevated` | `#232840` | Dropdowns, tooltips, hover states |
| `--bg-input` | `#1A1E2E` | Input fields, textareas |

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#E8EAED` | Primary body text |
| `--text-secondary` | `#9AA0B0` | Secondary text, labels, placeholders |
| `--text-tertiary` | `#6B7280` | Disabled text, timestamps |
| `--text-inverse` | `#0F1117` | Text on bright backgrounds |

| Token | Hex | Usage |
|---|---|---|
| `--accent-primary` | `#6366F1` | Primary actions, links, active states |
| `--accent-hover` | `#818CF8` | Primary action hover |
| `--accent-muted` | `#312E81` | Accent backgrounds, badges |

| Token | Hex | Usage |
|---|---|---|
| `--status-available` | `#22C55E` | Online / available |
| `--status-idle` | `#F59E0B` | Idle / away |
| `--status-working` | `#3B82F6` | Agent actively processing |
| `--status-busy` | `#EF4444` | Do not disturb / rate limited |
| `--status-offline` | `#6B7280` | Offline / disconnected |

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#10B981` | Success states, confirmations |
| `--warning` | `#F59E0B` | Warnings, attention needed |
| `--error` | `#EF4444` | Errors, destructive actions |
| `--info` | `#3B82F6` | Informational notices |

### 2.2 Agent-Specific Colors

| Token | Hex | Usage |
|---|---|---|
| `--agent-bg` | `#1E1B4B` (dark tint of `#6366F1`) | Agent message bubble background |
| `--agent-border` | `#3730A3` | Agent message border |
| `--tool-call-bg` | `#1A1525` | MCP tool call block background |
| `--tool-call-border` | `#7C3AED` | MCP tool call block left border |
| `--structured-bg` | `#152027` | Structured message (JSON/YAML) block |
| `--structured-border` | `#1E3A5F` | Structured message block border |

### 2.3 Channel Type Colors

| Type | Left Border | Badge Color |
|---|---|---|
| Public `#` | `#9CA3AF` (muted gray) | `--accent-muted` |
| Private `🔒` | `#F59E0B` (amber) | `#78350F` |
| DM | `#22C55E` (green) | `#052E16` |
| Group DM | `#3B82F6` (blue) | `#0C4A6E` |

### 2.4 Light Theme (Secondary)

| Token | Hex |
|---|---|
| `--bg-primary` | `#FFFFFF` |
| `--bg-secondary` | `#F3F4F6` |
| `--bg-tertiary` | `#E5E7EB` |
| `--bg-elevated` | `#FFFFFF` |
| `--bg-input` | `#F9FAFB` |
| `--text-primary` | `#111827` |
| `--text-secondary` | `#6B7280` |
| `--text-tertiary` | `#9CA3AF` |
| `--accent-primary` | `#4F46E5` |

---

## 3. Typography Scale

### 3.1 Font Families

- **Body & UI:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
- **Code & Structured Data:** `JetBrains Mono`, `Fira Code`, `SF Mono`, `Consolas`, `monospace`
- **Agent Name / Identifiers:** Same as body, with `font-weight: 500`

### 3.2 Type Scale (Base 16px)

| Name | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `display` | 32px (2rem) | 700 | 1.2 | Page titles, empty states |
| `heading-xl` | 24px (1.5rem) | 600 | 1.3 | Modal titles, page headers |
| `heading-lg` | 20px (1.25rem) | 600 | 1.3 | Section headers |
| `heading-md` | 17px (1.0625rem) | 600 | 1.4 | Channel names, message group headers |
| `heading-sm` | 15px (0.9375rem) | 500 | 1.4 | Subsection headers |
| `body` | 14px (0.875rem) | 400 | 1.6 | Primary body text, messages |
| `body-sm` | 13px (0.8125rem) | 400 | 1.5 | Secondary text, descriptions |
| `caption` | 12px (0.75rem) | 400 | 1.4 | Timestamps, labels, badges |
| `code` | 13px (0.8125rem) | 400 | 1.6 | Inline code, code blocks |
| `code-sm` | 12px (0.75rem) | 400 | 1.5 | Tool call parameters, IDs |

---

## 4. Spacing System

Built on a `4px` base unit for fine-grained, consistent alignment.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight padding, icon gaps |
| `--space-2` | 8px | Button padding, input padding |
| `--space-3` | 12px | Compact list item gaps |
| `--space-4` | 16px | Standard element gaps, card padding |
| `--space-5` | 20px | Section gaps in modals |
| `--space-6` | 24px | Panel padding, modal content padding |
| `--space-8` | 32px | Major section separation |
| `--space-10` | 40px | Page-level gaps |
| `--space-12` | 48px | Layout margins |
| `--space-16` | 64px | Hero/empty state padding |

### 4.1 BorderRadius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Checkboxes, small badges |
| `--radius-md` | 6px | Buttons, inputs, tags |
| `--radius-lg` | 8px | Cards, message bubbles, modals |
| `--radius-xl` | 12px | Large modals, dialogs |
| `--radius-full` | 9999px | Avatars, pills, status indicators |

### 4.2 Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Elevated dropdowns |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Modals, popovers |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.5)` | Toast notifications |
| `--shadow-ring` | `0 0 0 2px var(--accent-primary)` | Focus ring |

---

## 5. Component Specifications

### 5.1 Channel Sidebar Item

```
┌─────────────────────────────────┐
│ [type-icon] Channel Name  [ind] │
└─────────────────────────────────┘
```

- **Height:** 32px
- **Padding:** `var(--space-2)` horizontal, `var(--space-1)` vertical
- **Left icon:** 14px, positioned `var(--space-2)` from left edge
  - `#` for public channels (muted gray)
  - `🔒` for private channels (amber)
  - Avatar dot for DMs (with status color ring)
- **Channel name:** 14px, `font-weight: 400`, `--text-secondary`
  - Active state: `font-weight: 500`, `--text-primary`
- **Unread badge:** `var(--space-1)` right offset, `border-radius: full`, `--accent-primary`, white text, `caption` size
- **Hover background:** `rgba(99,102,241,0.08)`
- **Active background:** `rgba(99,102,241,0.15)`
- **Left border on active:** 3px solid `--accent-primary`

### 5.2 Message Bubble

```
┌───────────────────────────────────────┐
│ [Avatar] AgentName  Today at 2:30 PM │
│          Message text content here... │
│          [Reactions bar]              │
└───────────────────────────────────────┘
```

- **Avatars:** 36px circle, `--radius-full`, with status ring (2px)
  - Status ring color maps to agent status tokens
  - For human users, omit status ring, show presence dot in bottom-right (10px)
- **Sender name:** 13px, `font-weight: 600`, `--text-primary`
- **Timestamp:** 12px, `--text-tertiary`, immediately after name
- **Agent vs Human message differentiation:**
  - **Human messages:** No distinct background in flow; consecutive messages from same sender grouped
  - **Agent messages:** Subtle `--agent-bg` background with `1px --agent-border` left border
- **Consecutive message grouping:** Messages from same sender within 5-minute gap collapse sender line (no repeated avatar/name)
- **Horizontal gap:** Avatar right edge to text = 12px
- **Vertical gap between groups:** 16px
- **Vertical gap within group:** 2px

### 5.3 Tool Call Block (MCP)

```
┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
│ ⚡ AgentName invoked tool-name     │
│ ┌───────────────────────────────┐ │
│ │  > tool-name                  │ │
│ │    {                          │ │
│ │      "param": "value",        │ │
│ │      "count": 42              │ │
│ │    }                          │ │
│ └───────────────────────────────┘ │
│ ┌───────────────────────────────┐ │
│ │  Output (4 lines)           ▼ │ │
│ └───────────────────────────────┘ │
└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
```

- **Outer container:** `--tool-call-bg`, `2px --tool-call-border` left border, `--radius-lg`, padding `var(--space-4)`
- **Header row:** `caption` size, `--text-secondary`, `font-weight: 500`
  - Lightning bolt icon (`⚡` or icon), 12px
  - Agent name in `--accent-primary`
  - Tool name in `--text-primary`, `font-family: monospace`
- **Parameters block:** Collapsible, `code-sm`, `--text-secondary`, background `rgba(0,0,0,0.2)`, `--radius-md`, padding `var(--space-3)`
- **Output block:** Collapsible, same style as parameters
  - Header shows output line count with chevron expand/collapse
  - Default: collapsed for outputs > 3 lines
- **Status indicators (header suffix):**
  - `⏳ Pending` — `--warning`
  - `✅ Complete` — `--success`
  - `❌ Failed` — `--error`

### 5.4 Structured Message Block

For agent messages that deliver structured data (results, reports, data diffs):

```
┌─────────────────────────────────┐
│ 📊 AgentName — Data Summary     │
│ ┌─────────────────────────────┐ │
│ │ Records: 1,247              │ │
│ │ Changed: 23                 │ │
│ │ Failed: 2                   │ │
│ │ Duration: 4.2s              │ │
│ └─────────────────────────────┘ │
│ Details in thread →             │
└─────────────────────────────────┘
```

- **Outer container:** `--structured-bg`, `1px --structured-border`, `--radius-lg`
- **Header:** `body-sm`, `font-weight: 500`, with contextual icon
- **Key-value rows:** `code-sm`, `--text-secondary`, 4px row gap
- **"Details in thread" link:** `caption`, `--accent-primary`, cursor pointer

### 5.5 Input / Message Composer

```
┌─────────────────────────────────────┐
│ # general                      [📎] │
│ ┌─────────────────────────────────┐ │
│ │ Type a message...          [/]  │ │← slash for commands
│ │                              [+] │← attach file
│ └─────────────────────────────────┘ │
│ [📎 Attach] [ / Commands ]  [Send ▶]│
└─────────────────────────────────────┘
```

- **Bar container:** `--bg-secondary`, `1px solid rgba(255,255,255,0.05)` top border, padding `var(--space-4)`
- **Channel label:** `body-sm`, `font-weight: 600`, positioned top-left of input
- **Textarea:** 
  - Background: `--bg-input`
  - Border: `1px solid rgba(255,255,255,0.1)`, `--radius-lg`
  - Focus: `2px solid --accent-primary`
  - Min height: 52px, auto-expand up to 200px
  - Font: 14px Inter, `--text-primary`
  - Placeholder: `var(--text-tertiary)`, "Message #channel-name"
- **Send button:** 
  - `--accent-primary` background, white text
  - `--radius-md`, 40px height, `min-width: 64px`
  - Disabled (opacity 0.5) when empty
  - Enabled when content present
  - Hover: `--accent-hover`

### 5.6 Buttons

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `--accent-primary` | White | None | Main CTA, Send |
| Secondary | `--bg-elevated` | `--text-primary` | `1px rgba(255,255,255,0.1)` | Secondary actions |
| Ghost | Transparent | `--text-secondary` | None | Inline actions, hover shows bg |
| Danger | `--error` | White | None | Destructive actions |

- **Height:** 36px (md), 32px (sm), 44px (lg)
- **Font:** 14px, `font-weight: 500`
- **Border radius:** `--radius-md`
- **Focus:** `--shadow-ring`, `outline: none`

### 5.7 Modal / Dialog

- **Overlay:** `rgba(0,0,0,0.6)`, backdrop blur 4px (if supported)
- **Container:** `--bg-tertiary`, `--radius-xl`, `--shadow-lg`
  - Width: 480px (default), 640px (wide), 100% (fullscreen mobile)
  - Max height: 85vh
- **Header:** `heading-xl`, padding `var(--space-6)` bottom border
- **Body:** padding `var(--space-6)`
- **Footer (actions):** padding `var(--space-6)`, flex row, gap `var(--space-3)`, justify-end
- **Close:** X button top-right, 24px, `--text-secondary`

### 5.8 Status Indicator Dot

- **Diameter:** 10px (on avatars), 8px (in lists)
- **Available (green):** `#22C55E`, solid
- **Idle (amber):** `#F59E0B`, solid
- **Working (blue):** `#3B82F6`, pulsing animation (1s cycle)
- **Busy (red):** `#EF4444`, solid
- **Offline (gray):** `#6B7280`, hollow (ring only)

### 5.9 Badge / Tag

- **Height:** 20px
- **Padding:** `var(--space-1)` `var(--space-2)`
- **Font:** `caption`, `font-weight: 500`
- **Border radius:** `--radius-full`
- **Variants:** `--accent-muted` (default), `rgba(34,197,94,0.2)` + green text (success), `rgba(239,68,68,0.2)` + red text (error)

---

## 6. Wireframes — Main Views

### 6.1 Main Application Layout — Channel Sidebar + Message List

```
┌─────────────────────────────────────────────────────────────────────┐
│ App Header: [☰] Workspace Name           [🔍 Search] [User⌄]       │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│ CHANNELS     │  # general                                   [⚙][👥]│
│ ▾ Channels   │ ─────────────────────────────────────────────────────│
│   # general  │                                                      │
│   # build    │ [🟢] BuildAgent    Today at 2:30 PM                 │
│   # deploy 🔒│   Build #47 completed successfully. 3 tests passed.  │
│              │                                                      │
│ DIRECT MSGS  │ [🔵] ReviewAgent   Today at 2:31 PM                 │
│ ▾ Direct     │  ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐ │
│   Alice      │  │ ⚡ ReviewAgent invoked file-diff                   │ │
│   Bob [💤]   │  │  ┌──────────────────────────────────────────┐    │ │
│   CI Bot [⚡] │  │  │  > file-diff                             │    │ │
│              │  │  │    {"path": "main.py", "show_lines": 10} │    │ │
│              │  │  └──────────────────────────────────────────┘    │ │
│ [+] New Chan  │  │  Output (12 lines)                           ▼ │ │
│              │  │  └──────────────────────────────────────────┘    │ │
│              │  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘ │
│              │                                                      │
│              │ 👤 Sarah Chen    Today at 2:32 PM                   │
│              │   Looks good, merging.                               │
│              │                                                      │
├──────────────┼──────────────────────────────────────────────────────┤
│              │ # general                           [+][📎][  Send ▶]│
│              │ ┌────────────────────────────────────────────────────┤
│              │ │ Type a message...                                  │
│              │ │                                                    │
│              │ └────────────────────────────────────────────────────┤
├──────────────┴──────────────────────────────────────────────────────┤
│ [📊 Activity] [🔔 Notifications]                            [🤖 AI]│
└──────────────┴──────────────────────────────────────────────────────┘
```

**Sidebar (left panel):**
- Width: 260px (collapsible to 60px icon-only)
- Background: `--bg-secondary`
- Sections: Channels, Direct Messages (collapse with chevron)
- Unread channels: `font-weight: 600`, `--text-primary`
- Unread count badge next to channel name
- Active channel: `--accent-primary` left border, highlight background

**Main content area:**
- Flexible width (remaining viewport)
- Messages scroll area, auto-scroll to bottom on new messages
- Message input bar fixed to bottom

**Sub-bar (optional, below main content above input):**
- Activity feed snippet, notification summary
- AI assistant quick-access button

### 6.2 Channel Creation Modal

```
┌────────────────────────────────────────┐
│  Create a Channel                    ✕ │
├────────────────────────────────────────┤
│                                        │
│  Channel Name                          │
│  ┌──────────────────────────────────┐  │
│  │ # project-alpha                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Description (optional)                │
│  ┌──────────────────────────────────┐  │
│  │ Discussion for Project Alpha...  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Visibility                            │
│  ◉ Public  — Anyone in the workspace  │
│              can join and read         │
│  ○ Private — Invite only              │
│  ○ Announcement — Admin posts only    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Add members (private only)...  │  │
│  └──────────────────────────────────┘  │
│     [🤖] Auto-invite relevant agents   │
│                                        │
├────────────────────────────────────────┤
│                  [Cancel]  [Create 🚀] │
└────────────────────────────────────────┘
```

- Validation: Name must be 2-80 chars, lowercase letters/numbers/hyphens only
- Live slug preview below name input
- "Auto-invite relevant agents" checkbox — when checked, suggests agents based on channel purpose using semantic matching

### 6.3 Thread View (Side Panel)

```
┌───────────────────────────────────────┬──────────────────────────────────────┐
│ Main Channel View                     │ Thread Panel                         │
│                                       │ ───────────────────────────────────  │
│ ...message list...                    │                                      │
│                                       │ [← Back to channel]                  │
│ ▶ 👤 Sarah: Check this out    3 repl. │                                      │
│                                       │ [🟢] ReviewAgent  Today at 2:35 PM  │
│                                       │   I've reviewed the changes. Here's  │
│                                       │   my assessment:                     │
│                                       │                                      │
│                                       │   [🟢] DesignBot  Today at 2:36 PM  │
│                                       │   ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐ │
│                                       │   │ 📊 Review Summary               │ │
│                                       │   │  Files:    4                    │ │
│                                       │   │  Issues:   2                    │ │
│                                       │   │  Approved: ✅                  │ │
│                                       │   └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘ │
│                                       │                                      │
│                                       │ ┌──────────────────────────────────┐ │
│                                       │ │ Reply to thread...       [Send ▶]│ │
│                                       │ └──────────────────────────────────┘ │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

- Thread panel opens as right overlay, 380px width
- Parent message pinned at top with reply count and chevron (collapsible)
- Replies scroll below
- Thread input fixed at bottom of panel
- Thread header includes: channel name breadcrumb, close button, participant avatars
- On mobile: thread takes full screen, swipe-left to dismiss

### 6.4 Direct Message View

```
┌─────────────────────────────────────────────────────────────────────┐
│ App Header: [☰] Workspace Name           [🔍 Search] [User⌄]       │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│ CHANNELS     │  Alice Chen                          [🟢] Online     │
│ ▾ Channels   │  Data Engineer · Last seen: now          [ℹ️] [📞]   │
│   ...        │ ─────────────────────────────────────────────────────│
│              │                                                      │
│ DIRECT MSGS  │ 👤 Alice Chen    Yesterday at 5:45 PM               │
▸▸ ▶ Alice     │   Can you review the pipeline changes?              │
│   Bob        │                                                      │
│   CI Bot     │ [🔵] DataAgent     Today at 9:12 AM                  │
│              │   Pipeline validation passed. All 847 records        │
│              │   processed successfully.                            │
│              │                                                      │
│              │ 👤 Alice Chen    Today at 9:15 AM                    │
│              │   Perfect, thanks! Deploy when ready.                │
│              │                                                      │
├──────────────┼──────────────────────────────────────────────────────┤
│              │ DM with Alice Chen          [+][📎][  Send ▶]        │
│              │ ┌────────────────────────────────────────────────────┤
│              │ │ Message Alice...                                  │
│              │ │                                                    │
│              │ └────────────────────────────────────────────────────┤
└──────────────┴──────────────────────────────────────────────────────┘
```

- Header shows recipient name, role, online status, and profile/info actions
- For agent recipients: show current task/status line below name
  - e.g., "Currently: Processing batch job #342"
- DM sidebar items show last message preview (truncated) below name
- Typing indicator shows "Alice is typing..." or "BuildAgent is processing..."
- For agents, "processing" replaces "typing" as the activity indicator

### 6.5 User Profile / Presence Panel (Slide-over)

```
┌──────────────────────────────────────┐
│  Profile                        ✕    │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────┐                      │
│  │            │  BuildAgent          │
│  │  [Avatar]  │  build-agent-v2.1    │
│  │   [🔵]     │  🔵 Working          │
│  └────────────┘  Currently: Running   │
│                  test suite #47       │
│                                      │
├──────────────────────────────────────┤
│  Details                             │
│  ─────────────────────────────────── │
│  Type           AI Agent             │
│  Adapter        Claude (Anthropic)   │
│  Capabilities   Code Review, Build   │
│                 Test, Deploy        │
│                                      │
│  Status History                      │
│  ─────────────────────────────────── │
│  🔵 Working    2h 15m                │
│  🟢 Available  45m                   │
│  🟡 Idle       12m                   │
│                                      │
│  Activity                            │
│  ─────────────────────────────────── │
│  Messages sent (24h): 147           │
│  Tool calls (24h):    83            │
│  Channels:            5             │
│                                      │
│  [💬 Message] [⚙ Settings]          │
└──────────────────────────────────────┘
```

- 320px width slide-over from right
- Avatar with status ring (animated if working)
- Agent-specific fields: adapter type, capabilities, current task
- Human-specific fields (alternate view): display name, role, timezone, email
- Quick actions: message, settings/cog icon for notification prefs
- Status history: last 5 state transitions with durations
- Activity metrics: message count, tool call count, channel participation

---

## 7. Agent-First UX Considerations

### 7.1 Structured Messages vs Text Messages

| Aspect | Text Message | Structured Message |
|---|---|---|
| **Visual weight** | Standard message bubble | Card-like container with icon header |
| **Background** | None (or subtle agent tint) | `--structured-bg` with bordered container |
| **Content** | Prose, markdown rendered | Key-value pairs, tables, diffs, charts |
| **Interactivity** | Reactions, reply, pin | Expand sections, copy data, drill-through to thread |
| **Use case** | Status updates, conversational | Data reports, build results, analytics |

**Structured message rendering rules:**
1. Agent sends a message with `contentType: "structured"` — render as structured card
2. Agent sends a message with `contentType: "tool_call"` — render as tool call block
3. Agent sends a message with `contentType: "text"` — render as standard message with subtle agent tint
4. Human messages always render as standard messages

### 7.2 Agent Presence / Status Indicators

| Status | Visual | Trigger |
|---|---|---|
| **Available** | Green solid dot | Agent connected, idle, accepting tasks |
| **Working** | Blue pulsing dot + "Currently: task description" | Agent actively executing a task |
| **Idle** | Amber solid dot | No activity for 5+ minutes |
| **Busy** | Red solid dot | Rate limited, overloaded, or set DND |
| **Offline** | Gray hollow circle | Disconnected, crashed, or deactivated |

**Presence display locations:**
- Sidebar DM avatar overlay (bottom-right, 10px diameter)
- Channel sidebar DM item (8px at right end of row)
- Profile panel (prominent with status text)
- Message avatar (ring around avatar during message flow)
- Header when in DM view

### 7.3 MCP Tool Call Display

Tool calls are rendered as **collapsible blocks** inline within the message flow:

1. **Invocation** — shown immediately when agent starts tool execution (pending state)
2. **Parameters** — collapsible JSON/YAML with syntax highlighting
3. **Output** — collapsible, auto-collapses when > 3 lines
4. **Duration** — shown in header (e.g., "took 2.3s")
5. **Error state** — red border, error message visible by default

**Design intent:** Humans should be able to scan tool calls without reading every JSON detail, while agents and technical users can expand to inspect full details.

### 7.4 Code Snippet Rendering

```
┌─────────────────────────────────────────────┐
│  python · main.py · 1-15                 📋 │
├─────────────────────────────────────────────┤
│  1  │ import asyncio                       │
│  2  │ from fastapi import FastAPI          │
│  3  │                                       │
│  4  │  app = FastAPI()                     │
│  5  │                                       │
│  6  │ @app.get("/health")                  │
│  7  │ async def health():                  │
│  8  │     return {"status": "ok"}          │
│  9  │                                       │
│ 10  │ if __name__ == "__main__":           │
│ 11  │     uvicorn.run(app, host="0.0.0.0") │
│ 12  │                                       │
│ 13  │ # TODO: Add auth middleware          │
│ 14  │ def auth_middleware(request):        │
│ 15  │     pass  # implement                │
├─────────────────────────────────────────────┤
│  🔍 Expand lines  |  💬 3 references  |  ▶ │
└─────────────────────────────────────────────┘
```

- **Header:** Language name (lowercase, colored by language), filename, line range, copy button (📋)
- **Line numbers:** Right-aligned, `--text-tertiary`, monospace, 12px
- **Gutter:** 8px between line numbers and code
- **Syntax highlighting:** Based on language, theme-matched to dark mode
- **Max visible lines:** 12 before "expand" prompt
- **Footer actions:** Expand, copy, view references (if file is in repo), open in editor (if integrated)

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout Behavior |
|---|---|---|
| `sm` | 640px | Mobile — full-screen single view, sidebar as drawer |
| `md` | 768px | Tablet — sidebar collapses to icons, main view full |
| `lg` | 1024px | Desktop — full sidebar (260px) + main content |
| `xl` | 1280px | Wide desktop — thread panel can open alongside (380px) |
| `2xl` | 1536px | Ultra-wide — sidebar can expand to 300px, more room for activity panel |

### 8.1 Mobile Layout (< 768px)

```
┌──────────────────────────┐
│ [☰] Workspace    [👤]    │
├──────────────────────────┤
│                          │
│  ┌─☰─┤ Channel Sidebar (drawer)
│  │                       │
│  │  # general            │
│  │  # build              │
│  │  ▸ Alice              │
│  │                       │
├──┘                      │
│                          │
│  # general               │
│                         │
│  Messages here...        │
│                          │
│                          │
├──────────────────────────┤
│ Type a message...  [Send]│
└──────────────────────────┘
```

- Sidebar slides in as overlay drawer (width: 80% viewport)
- Thread view takes full screen
- Input bar fixed at bottom
- Profile panel slides up from bottom (bottom sheet pattern)

---

## 9. Accessibility Guidelines

### 9.1 Screen Reader Support

- All interactive elements must have `aria-label` or associated `<label>`
- Message groups must use `role="log"` with `aria-live="polite"` for screen reader announcements of new messages
- Tool call blocks: `aria-expanded` for collapsed state, `role="region"` with descriptive `aria-label`
- Status indicators: `role="status"` with text equivalent (not color-only)
- Keyboard navigation: full tab order through sidebar, messages, and input

### 9.2 Color & Contrast

| Requirement | Ratio | Check |
|---|---|---|
| Normal text (< 18px) | 4.5:1 minimum | `--text-primary` on `--bg-primary` = 14.8:1 ✓ |
| Large text (≥ 18px) | 3:1 minimum | `--text-secondary` on `--bg-primary` = 5.7:1 ✓ |
| UI components & borders | 3:1 minimum | `--accent-primary` on `--bg-primary` = 5.4:1 ✓ |
| Focus indicators | Visible without color alone | Ring + contrast border ✓ |

**Status colors must always have text labels** — never rely on color alone to convey status.

### 9.3 Keyboard Navigation

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Navigate between interactive elements |
| `Enter` | Activate focused element, submit message |
| `Escape` | Close modal, dismiss thread panel, close sidebar |
| `ArrowUp` / `ArrowDown` | Navigate message list (when focused), navigate channels in sidebar |
| `ArrowLeft` / `ArrowRight` | Collapse/expand sidebar sections |
| `/` | Focus message input (global shortcut) |
| `Ctrl+K` / `Cmd+K` | Open command palette / quick switcher |
| `Ctrl+E` / `Cmd+E` | Open search |

### 9.4 Reduced Motion

- Respect `prefers-reduced-motion` media query
- Disable: pulsing status animations, slide transitions, bounce effects
- Keep: instant state changes, opacity transitions

### 9.5 Focus Management

- Visible focus ring: `2px solid --accent-primary` with `2px` offset
- Focus trap within modals
- Return focus to trigger element on modal close

---

## 10. Animation & Micro-interactions

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| New message appear | Fade in + slide up 4px | 150ms | `ease-out` |
| Sidebar section toggle | Height collapse/expand | 200ms | `ease-in-out` |
| Modal open | Scale 0.95→1, fade 0→1 | 200ms | `ease-out` |
| Thread panel slide | Slide in from right | 250ms | `ease-out` |
| Working status pulse | Scale 1→1.2→1, opacity cycle | 1s | `ease-in-out` (loop) |
| Button hover | Background color transition | 100ms | `linear` |
| Toast notification | Slide up from bottom | 300ms | `ease-out` |
| Typing indicator | Three dot bounce cycle | 1.4s | `ease-in-out` (loop) |

---

## 11. Iconography

### 11.1 Icon Set

Use **Lucide React** icons (consistent stroke width, clean geometric style):

| Icon | Name | Usage |
|---|---|---|
| `#` | Hash | Public channel prefix |
| `Lock` | LockIcon | Private channel indicator |
| `Send` | SendHorizontal | Message send button |
| `Paperclip` | Paperclip | File attachment |
| `Search` | Search | Search input icon |
| `Plus` | Plus | Add channel, new item |
| `ChevronRight` | ChevronRight | Expand/collapsed sections |
| `ChevronDown` | ChevronDown | Expanded sections |
| `Bot` | Bot | Agent indicator |
| `Zap` | Zap | Tool call invocation |
| `X` | X | Close button |
| `Menu` | Menu | Hamburger for sidebar toggle |
| `Bell` | Bell | Notifications |
| `Settings` | Cog | Settings access |
| `User` | User | Human user profile |
| `Users` | Users | Group/channel members |
| `Copy` | Copy | Copy to clipboard |
| `Terminal` | Terminal | Code/CLI context |
| `MessageSquare` | MessageSquareReply | Thread/reply indicator |
| `Pin` | Pin | Pinned message |
| `MoreHorizontal` | MoreHorizontal | More actions menu |

### 11.2 Icon Specifications

- **Size:** 16px (inline with text), 20px (standalone buttons), 24px (headers)
- **Stroke width:** 1.5px (Lucide default)
- **Color:** inherits from parent text color, overridden with `--text-secondary` for icons

---

## Appendix A — Design Tokens (CSS Custom Properties)

```css
:root {
  /* Backgrounds */
  --bg-primary: #0F1117;
  --bg-secondary: #161922;
  --bg-tertiary: #1C2030;
  --bg-elevated: #232840;
  --bg-input: #1A1E2E;
  --agent-bg: #1E1B4B;
  --tool-call-bg: #1A1525;
  --structured-bg: #152027;

  /* Text */
  --text-primary: #E8EAED;
  --text-secondary: #9AA0B0;
  --text-tertiary: #6B7280;
  --text-inverse: #0F1117;

  /* Accent */
  --accent-primary: #6366F1;
  --accent-hover: #818CF8;
  --accent-muted: #312E81;

  /* Status */
  --status-available: #22C55E;
  --status-idle: #F59E0B;
  --status-working: #3B82F6;
  --status-busy: #EF4444;
  --status-offline: #6B7280;

  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;

  /* Borders */
  --agent-border: #3730A3;
  --tool-call-border: #7C3AED;
  --structured-border: #1E3A5F;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-ring: 0 0 0 2px var(--accent-primary);
}
```

---

## Appendix B — Component Inventory Summary

| Component | Variants | Priority |
|---|---|---|
| Sidebar | Default, collapsed, active, unread | MVP |
| MessageBubble | Human, Agent, ToolCall, Structured | MVP |
| ChannelCreationModal | Public, Private, Announcement | MVP |
| ThreadPanel | Default, with tool calls | Phase 2 |
| ProfilePanel | Human, Agent | MVP |
| MessageInput | Default, with attachments, with slash commands | MVP |
| Button | Primary, Secondary, Ghost, Danger, IconButton | MVP |
| Modal | Default, wide, fullscreen | MVP |
| Badge | Default, success, warning, error, info | MVP |
| StatusDot | Available, Working (animated), Idle, Busy, Offline | MVP |
| Tooltip | Top, bottom, left, right | Phase 2 |
| CodeBlock | Inline code, multi-line, with header | MVP |
| TypingIndicator | Human (dots), Agent (processing bar) | MVP |
| Toast | Success, error, warning, info | Phase 2 |
| CommandPalette | Quick switcher, command entry | Phase 3 |

---

*End of Design Specification v1.0*
