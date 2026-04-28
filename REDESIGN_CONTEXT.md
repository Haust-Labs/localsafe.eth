# Haust Safe — Developer Design System Guide

## What is this

**haust-safe** is a fork of [Cyfrin/localsafe.eth](https://github.com/Cyfrin/localsafe.eth) — a multisig Safe wallet UI. This branch (`redesign`) applies a full visual rebrand to Haust. Only styling is changed; no business logic is touched.

**Why:** Haust is moving B2B and needs a branded Safe UI for partners.

---

## Stack

| Tool | Version |
|---|---|
| Next.js | 15.5 |
| React | 19 |
| TypeScript | 5.x |
| Tailwind CSS | v4 |
| DaisyUI | v5 |
| Color space | OKLch |
| Font | Inter (Google Fonts) |

---

## Architecture — 3-file design system

All visual changes live in **3 files only**. Never touch component logic.

```
app/
├── colors.css           ← ALL design tokens (colors, radius, border)
├── globals.css          ← Component overrides (buttons, badges, alerts, code blocks)
└── assets/custom/       ← Brand assets (logo SVG as React component)
    └── HaustSafeLogo.tsx
```

### Rule of thumb
- **Color/spacing change?** → edit `colors.css`
- **Component behavior change** (badge style, button radius, etc.)? → edit `globals.css`
- **Logo or icon change?** → add to `assets/custom/`, update `components/NavBar.tsx`

---

## colors.css — Token reference

```css
[data-theme="haust"] {
  color-scheme: dark;

  /* --- Backgrounds --- */
  --color-base-100: oklch(0% 0 0);        /* main bg — absolute black */
  --color-base-200: oklch(19% 0.007 258); /* cards, navbar, footer */
  --color-base-300: oklch(27% 0.013 258); /* code blocks, dividers */
  --color-base-content: oklch(84% 0.018 256); /* body text */

  /* --- Brand --- */
  --color-primary: oklch(91% 0.144 189);  /* mint/teal — main CTA */
  --color-primary-content: oklch(0% 0 0); /* text ON primary bg */
  --color-secondary: oklch(100% 0 0);     /* white */
  --color-secondary-content: oklch(0% 0 0);
  --color-accent: oklch(71% 0.233 316);   /* magenta/pink */
  --color-accent-content: oklch(0% 0 0);

  /* --- Neutral --- */
  --color-neutral: oklch(33% 0.012 243);
  --color-neutral-content: oklch(92% 0.008 254);

  /* --- Semantic (used in badges, alerts, step indicators) --- */
  --color-info: oklch(69% 0.171 251);
  --color-info-content: oklch(0% 0 0);    /* text ON info bg */
  --color-success: oklch(77% 0.203 152);
  --color-success-content: oklch(0% 0 0);
  --color-warning: oklch(93% 0.175 103);
  --color-warning-content: oklch(0% 0 0);
  --color-error: oklch(69% 0.208 10);
  --color-error-content: oklch(0% 0 0);

  /* --- Shape --- */
  --radius-selector: 0.5rem;   /* checkboxes, toggles */
  --radius-field: 0.75rem;     /* inputs, selects */
  --radius-box: 1rem;          /* cards, modals, dropdowns */

  /* --- Border --- */
  --border: 1px;
}
```

> **Note on `-content` tokens:** Always set these alongside the main color.
> DaisyUI uses `-content` for text rendered ON that color background
> (step indicators, button labels). If unset, DaisyUI defaults to white.

---

## globals.css — Component overrides

These overrides fix DaisyUI v5 specificity issues and apply the Haust visual style system-wide.

### Button radius
DaisyUI's `themes.css` sets `--radius-field: 0.25rem` on `:root`, overriding the theme token.
We override directly on `.btn`:

```css
.btn:not(.btn-circle):not(.btn-square) {
  border-radius: 0.75rem;
}
```

### Semantic components (badges, alerts, toasts)
All semantic color components use **transparent fill** + **colored text** + **subtle border**:

```css
.badge-success, .alert-success {
  background-color: color-mix(in oklch, var(--color-success) 12%, transparent);
  color: var(--color-success);
  border-color: color-mix(in oklch, var(--color-success) 35%, transparent);
  border-width: 1px;
}
/* Same pattern for: primary, accent, info, warning, error */
```

### Code/pre blocks
All `<pre>` and inline `<code>` elements get consistent styling:
- Background: `base-300` (slightly lighter than cards `base-200`)
- Border radius: `0.75rem` (matches buttons)

---

## Key components

| Component | File | Notes |
|---|---|---|
| Navigation bar | `components/NavBar.tsx` | Logo from `assets/custom/HaustSafeLogo.tsx` |
| Footer | `components/Footer.tsx` | Black bg, white/20 top border |
| Card wrapper | `components/AppCard.tsx` | `bg-base-200`, no border, `rounded-2xl` |
| Step indicator | `components/Stepper.tsx` | Uses `step-primary`; DeploymentModal uses `step-success/error` |
| Data/code preview | `components/DataPreview.tsx` | Inherits global `pre` styles |
| EIP-712 display | `components/EIP712DataDisplay.tsx` | `bg-base-200` container |

---

## Design system preview

Run the app and open:
```
http://localhost:3002/design-system/
```

This page renders all DaisyUI components with the `haust` theme applied — buttons, badges, alerts, cards, forms, typography. Use it to QA visual changes.

---

## How to run

```bash
cd path/to/haust-safe
pnpm install
pnpm dev
# → http://localhost:3002 (or next available port)
# → http://localhost:3002/design-system/
```

## How to make visual changes

**Change a color:**
1. Open `app/colors.css`
2. Edit the `oklch(...)` value
3. Save — hot reload updates the browser

**Convert hex to oklch:**
Ask Claude: *"convert #46FFF4 to oklch"*
Or use: https://oklch.com

**Add a new component override:**
Add it to the `/* HAUST DESIGN SYSTEM */` block in `app/globals.css`

**Replace the logo:**
1. Put your SVG in `app/assets/custom/`
2. Create a `.tsx` wrapper (see `HaustSafeLogo.tsx` as template — inline SVG, `className` prop)
3. Import and use in `components/NavBar.tsx`

---

## What's done

- [x] Single `haust` theme, no light/dark toggle
- [x] `colors.css` — single source of truth for all tokens
- [x] `ThemeProvider` simplified — always `data-theme="haust"`
- [x] Inter font via Google Fonts
- [x] Haust logo in navbar (`assets/custom/HaustSafeLogo.tsx`)
- [x] Cards: grey fill (`bg-base-200`), no border, 16px radius
- [x] Navbar/Footer: black bg, `border-white/20` dividers
- [x] Buttons: 12px radius (direct CSS override)
- [x] Badges/alerts: transparent fill, colored text, subtle border
- [x] Code blocks: `bg-base-300`, 12px radius
- [x] Step indicators: black text (not white) via `-content` tokens
- [x] Design system page at `/design-system/` isolated from wallet providers
- [x] `pnpm build` passes with no errors

## What's left

- [ ] Final color pass from Figma (update oklch values in `colors.css`)
- [ ] Custom font if Inter is not final choice
- [ ] Visual QA on all screens at localhost
- [ ] Merge `redesign` → `main`
