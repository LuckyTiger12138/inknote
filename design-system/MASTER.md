# InkNote Design System — MASTER

> Source of truth for UI. Page overrides go in `design-system/pages/`.

## Product

- **Name:** InkNote
- **Platform:** Windows 10/11 desktop (Tauri)
- **Type:** Local-first Markdown notes
- **Tone:** Calm, dense-but-readable, professional productivity

## Layout

| Region | Width | Role |
|--------|-------|------|
| Sidebar | 220px (min 64 collapsed) | Nav, notebooks, settings |
| Note list | 300px (resizable 240–420) | Search results / note rows |
| Editor | `1fr` | Title, toolbar, Markdown, status |
| Title bar | 36px | App chrome (custom) |
| List/Editor toolbar | 44px | Actions |
| Status bar | 28px | Save state, word count |

Grid: `220px 300px 1fr` · Base unit: **4px** · Radius: **6–8px max**

## Color Tokens

### Dark (default)

```css
--bg-app: #0F1115;
--bg-sidebar: #12151C;
--bg-list: #161A22;
--bg-editor: #0F1115;
--bg-elevated: #1C212B;
--bg-hover: rgba(255, 255, 255, 0.04);
--border: #2A3140;
--border-subtle: #222833;
--text-primary: #E8EAED;
--text-secondary: #9AA3B2;
--text-muted: #6B7380;
--accent: #5B8DEF;
--accent-muted: rgba(91, 141, 239, 0.14);
--success: #3DDC97;
--warning: #F5A524;
--danger: #F07178;
--tag-bg: #243044;
--tag-text: #A8C3F0;
--code-bg: #1A1F2A;
--overlay: rgba(0, 0, 0, 0.45);
--shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
```

### Light

```css
--bg-app: #F7F8FA;
--bg-sidebar: #EEF1F6;
--bg-list: #FFFFFF;
--bg-editor: #FFFFFF;
--bg-elevated: #FFFFFF;
--bg-hover: rgba(15, 23, 42, 0.04);
--border: #E2E6EE;
--border-subtle: #EBEEF3;
--text-primary: #1E293B;
--text-secondary: #64748B;
--text-muted: #94A3B8;
--accent: #2563EB;
--accent-muted: rgba(37, 99, 235, 0.10);
--success: #059669;
--warning: #D97706;
--danger: #DC2626;
--tag-bg: #E8EEF9;
--tag-text: #3B6BC7;
--code-bg: #F1F5F9;
--overlay: rgba(15, 23, 42, 0.35);
--shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
```

## Typography

| Role | Font | Size | Weight | Line height |
|------|------|------|--------|-------------|
| UI | Inter / Segoe UI | 14px | 400–600 | 1.35 |
| Sidebar / list | Inter | 13–13.5px | 500–600 | 1.35 |
| Meta / tags | Inter | 11–12px | 500 | 1.3 |
| Note title | Inter | 28px | 700 | 1.25 |
| Editor body | Inter (opt. Source Serif 4) | 16px | 400 | 1.7 |
| Code | JetBrains Mono | 13px | 400 | 1.55 |
| Preview H2 | Inter | 20px | 650 | 1.3 |

Max content width in editor: **760px** (optional full-width setting).

## Components

### Nav item
- Icon 16px + label; height ~36px; radius 6px
- Active: left 2px accent bar + `--accent-muted` fill
- Hover: `--bg-hover`, 150ms

### Note row
- Height ~64–72px; title + 1-line preview + tags
- Active: accent bar + muted fill
- Pin icon uses accent, not loud badge

### Tag chip
- Pill, 11px, `--tag-bg` / `--tag-text`

### Icon button
- 28–32px hit target, radius 6px, hover fill

### Command palette
- Width 520–560px, centered, elevated surface + overlay
- Input + keyboard-navigable list

### Focus
- `box-shadow: 0 0 0 2px var(--accent)` or accent-muted ring
- Never rely on color alone

## Motion

- Duration: 150–250ms
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Honor `prefers-reduced-motion`

## Anti-patterns

- No purple/gradient marketing UI
- No card-in-card stacking for page sections
- No emoji-as-icons (use Lucide)
- No decorative orbs / glassmorphism stacks
- No radius > 8px on app chrome
- No white pure `#FFFFFF` large surfaces in dark mode

## Stack mapping

- CSS variables on `:root` / `[data-theme]`
- Tailwind theme extend maps to these tokens
- Icons: `lucide-react`
- Editor: CodeMirror 6 (source) + markdown-it preview

## Preview artifact

- `inknote-design/index.html` — interactive static mock (theme + palette)
