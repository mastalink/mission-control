# Mission Control — Design System Rules
# Figma MCP Integration Guidelines

These rules govern all UI implementation work in this project. Follow them for every
Figma-driven task and when adding new components from scratch.

---

## Project Identity

**Theme:** Dunder Mifflin Mission Control — a dark office-themed real-time AI agent dashboard
inspired by *The Office* (US). The aesthetic is deliberately retro-corporate: warm paper tones
on deep navy, serif typography, office furniture motifs. This personality must be preserved in
every new UI surface.

**Stack:** React 19 · TypeScript 5 · Tailwind CSS 3 · Framer Motion 11 · Zustand 5 · Vite 6

---

## Required Figma → Code Workflow

**Never skip steps. Do them in this order:**

1. `get_design_context` — structured representation of the node
2. `get_screenshot` — visual reference (use this to validate fidelity)
3. If response is too large → `get_metadata` first, then `get_design_context` on specific nodes
4. Download any assets referenced by localhost URLs from the Figma MCP server
5. Translate output into project conventions (see rules below)
6. Compare final render against the screenshot before marking complete

---

## Color Tokens — NEVER Hardcode

All colors live in `tailwind.config.ts` under `theme.extend.colors.dunder`.
**IMPORTANT: Always use these token names. Never use raw hex values in className props.**

| Token | Hex | Semantic use |
|-------|-----|--------------|
| `dunder-blue` | `#1a365d` | Primary background — walls, panels, app bg |
| `dunder-paper` | `#f5f0e8` | Primary text, highlights, "paper" surfaces |
| `dunder-carpet` | `#8b7355` | Secondary surfaces, borders, dividers |
| `dunder-wall` | `#d4c5a9` | Muted text, subtle backgrounds |
| `dunder-desk` | `#6b4c30` | Accent surfaces, furniture |
| `dunder-screen-off` | `#1e293b` | Inactive monitors, collapsed states |
| `dunder-screen-on` | `#3b82f6` | Active/connected indicators |
| `dunder-screen-error` | `#ef4444` | Error states on screens |

**Agent state colors** use standard Tailwind (these are intentional semantic choices, keep them):
- Idle/connected: `green-500` (#22c55e)
- Thinking: `amber-400` (#f59e0b)
- Talking: `blue-500` (#3b82f6)
- Tool calling: `purple-500` (#a855f7)
- Error: `red-500` (#ef4444)
- Offline: `gray-500` (#6b7280)

---

## Typography

**IMPORTANT: Use `font-dunder` (Georgia, serif) for all visible text in the UI.**

- Headers / branding: `font-dunder font-bold tracking-widest uppercase`
- Body text: `font-dunder text-dunder-paper`
- Technical labels / status: `font-mono text-xs` is acceptable for data-dense areas
- Standard Tailwind text sizes: `text-xs`, `text-sm`, `text-base` — use responsive prefixes (`sm:`)

---

## Component Organization

```
src/
├── building/     → UI panels, dialogs, header, empty states (non-SVG UI)
├── floor/        → SVG canvas, characters, furniture, channel doors
│   └── furniture/  → individual SVG furniture components
├── panels/       → side panel components (chat, agent, channel, instance)
├── store/        → Zustand stores only
├── gateway/      → WebSocket connection logic only (no UI)
├── characters/   → character definitions, registry, mapping (no UI)
├── hooks/        → shared React hooks
└── audio/        → sound effect utilities
```

- **IMPORTANT:** New UI components go in `building/` (panels) or `floor/` (SVG canvas items)
- Do not create a generic `components/` folder — follow the existing feature-area structure
- File naming: PascalCase for components (`FloorPlan.tsx`), camelCase for hooks/utils

---

## Component Patterns

**Props interface directly above the function — no separate file:**
```typescript
type Props = {
  instanceId: string;
  agentId?: string;
  onClose?: () => void;
};

export function MyPanel({ instanceId, agentId, onClose }: Props) { ... }
```

**Named exports only** — no default exports.

**Zustand usage inside components:**
```typescript
// Subscribe to specific slice — never subscribe to the whole store
const agents = useAgentStore((s) => s.agents[instanceId]);
const setPanel = useUIStore((s) => s.setActivePanel);

// Fire-and-forget actions outside reactive render: use getState()
useGatewayStore.getState().saveConnection(conn);
```

---

## Styling Rules

- **IMPORTANT:** Tailwind utility classes only — no inline `style={{}}` for colors or spacing
- **IMPORTANT:** Never hardcode hex colors in JSX — always use `dunder-*` tokens or named Tailwind colors
- Use `office-carpet` CSS class for textured carpet backgrounds (defined in `index.css`)
- Glassmorphism / blur panels: `bg-dunder-blue/80 backdrop-blur-sm border border-dunder-carpet/30`
- Scrollbars are pre-styled globally in `index.css` — do not override
- Responsive: mobile-first, `sm:` breakpoint for desktop enhancements

---

## Animation

**Two animation systems — use the right one for the context:**

1. **Framer Motion** (`motion.g`, `motion.div`, etc.) — for SVG character animations and
   component mount/unmount transitions. Patterns are in `floor/Character.tsx`.
2. **CSS keyframes** (defined in `index.css`) — for ambient loops:
   - `screen-glow` — monitor brightness pulse
   - `bubble-appear` — speech/thought bubble entry
   - `idle-bob` — character idle float
   - `thinking-type` — rotation while processing
   - `error-shake` — horizontal shake on error
   - `fly-message` — message path motion
   - `door-pulse` — channel door stroke pulse

**IMPORTANT:** Do not install additional animation libraries. Use Framer Motion or CSS keyframes.

---

## SVG Component Rules

Floor plan and characters are rendered as SVG. When adding to the canvas:

- Wrap animated SVG groups in Framer Motion: `<motion.g animate={...}>`
- Use `viewBox` coordinates consistent with the floor plan canvas (check `FloorPlan.tsx`)
- Character head color: `#fbbf24` (amber-400) — preserve this for all characters
- Body colors come from `CharacterDef.bodyColor` — never hardcode per-character colors in SVG
- Status indicators: small circles using agent state colors defined above

---

## Asset Handling

- **IMPORTANT:** If the Figma MCP server returns a `localhost:*` URL for an image or SVG asset, use that URL directly as the `src` — do not download and re-host
- **IMPORTANT:** Do not install new icon packages. Icons should come from the Figma payload or be hand-drawn as inline SVG
- Static assets (if any) go in `public/`

---

## State Management Rules

Four Zustand stores — do not add more without strong justification:

| Store | Owns |
|-------|------|
| `useGatewayStore` | Connection configs, saved connections, instance status |
| `useAgentStore` | Agent visual state, character assignments, streaming text |
| `useChannelStore` | Channel definitions and status per instance |
| `useUIStore` | Active panel, selected agent/instance, UI layout state |

- **IMPORTANT:** Never use React `useState` for data that needs to survive panel switches — put it in a Zustand store
- Co-locate store subscriptions: subscribe at the component that needs the data, not at a high ancestor

---

## Figma Design Translation Notes

When Figma output uses React + Tailwind, translate it as follows:

| Figma MCP output | This project's equivalent |
|------------------|--------------------------|
| Generic `bg-gray-900` | `bg-dunder-blue` |
| Generic `bg-gray-800` | `bg-dunder-screen-off` |
| Generic `text-white` | `text-dunder-paper` |
| Generic `border-gray-700` | `border-dunder-carpet/40` |
| `font-sans` | `font-dunder` |
| `rounded-lg bg-white/10` | Keep — glassmorphism panels are intentional |
| New icon library import | Replace with inline SVG or existing pattern |

**Before creating any new component:** check `building/`, `panels/`, and `floor/` for an
existing component that can be extended instead.

---

## Accessibility & Quality

- All interactive elements need `aria-label` if no visible text label exists
- Status colors must not be the *only* indicator — pair with icon or text
- TypeScript strict mode is on — no `any`, no non-null assertions without comment explaining why
- WCAG AA contrast against `dunder-blue` background
