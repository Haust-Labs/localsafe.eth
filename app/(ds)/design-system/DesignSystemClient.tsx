"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Note: tokens round-trip through 8-bit RGB hex (oklch → canvas → hex → oklch),
// so exported values drift slightly from the source `colors.css`. Treat the
// exported block as a starting point; copy individual rows rather than
// overwriting the whole file if exact source values matter.

function cssToHex(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color.trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const rl = toLinear(r),
    gl = toLinear(g),
    bl = toLinear(b);
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  const lPct = Math.round(L * 10000) / 100;
  const cRnd = Math.round(C * 10000) / 10000;
  const hRnd = Math.round(H * 100) / 100;
  if (C < 0.001) return `oklch(${lPct}% 0 0)`;
  return `oklch(${lPct}% ${cRnd} ${hRnd})`;
}

// ─── Token schema ─────────────────────────────────────────────────────────────

const TOKEN_GROUPS = [
  {
    id: "brand",
    label: "Brand",
    tokens: [
      { key: "--color-primary", label: "Primary" },
      { key: "--color-primary-content", label: "On Primary" },
      { key: "--color-secondary", label: "Secondary" },
      { key: "--color-secondary-content", label: "On Secondary" },
      { key: "--color-accent", label: "Accent" },
      { key: "--color-accent-content", label: "On Accent" },
    ],
  },
  {
    id: "base",
    label: "Backgrounds",
    tokens: [
      { key: "--color-base-100", label: "Base 100 (main bg)" },
      { key: "--color-base-200", label: "Base 200 (cards)" },
      { key: "--color-base-300", label: "Base 300 (borders)" },
      { key: "--color-base-content", label: "Content (text)" },
    ],
  },
  {
    id: "neutral",
    label: "Neutral",
    tokens: [
      { key: "--color-neutral", label: "Neutral" },
      { key: "--color-neutral-content", label: "On Neutral" },
    ],
  },
  {
    id: "semantic",
    label: "Semantic",
    tokens: [
      { key: "--color-info", label: "Info" },
      { key: "--color-success", label: "Success" },
      { key: "--color-warning", label: "Warning" },
      { key: "--color-error", label: "Error" },
    ],
  },
] as const;

type TokenMap = Record<string, string>;
interface Radii {
  selector: number;
  field: number;
  box: number;
}

const FONT_OPTIONS = [
  { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: "System UI" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Geist', sans-serif", label: "Geist" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Outfit', sans-serif", label: "Outfit" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "'Syne', sans-serif", label: "Syne" },
  { value: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans" },
];

const GOOGLE_FONTS: Record<string, string> = {
  "'Inter', sans-serif": "Inter",
  "'Geist', sans-serif": "Geist",
  "'DM Sans', sans-serif": "DM+Sans",
  "'Outfit', sans-serif": "Outfit",
  "'Space Grotesk', sans-serif": "Space+Grotesk",
  "'Syne', sans-serif": "Syne",
  "'Plus Jakarta Sans', sans-serif": "Plus+Jakarta+Sans",
};

const STORAGE_KEY = "haust-design-tokens-v3";

// ─── Component ────────────────────────────────────────────────────────────────

export default function DesignSystemClient() {
  const [tokens, setTokens] = useState<TokenMap>({});
  const [font, setFont] = useState("'Inter', sans-serif");
  const [radii, setRadii] = useState<Radii>({ selector: 8, field: 6, box: 12 });
  const [ready, setReady] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  const readTokens = useCallback((): TokenMap => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "haust");
    const style = getComputedStyle(root);
    const map: TokenMap = {};
    for (const group of TOKEN_GROUPS) {
      for (const { key } of group.tokens) {
        const raw = style.getPropertyValue(key).trim();
        if (raw) {
          try {
            map[key] = cssToHex(raw);
          } catch {
            map[key] = "#000000";
          }
        }
      }
    }
    return map;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "haust");
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { tokens: t, font: f, radii: r } = JSON.parse(saved);
        setTokens(t ?? readTokens());
        if (f) setFont(f);
        if (r) setRadii(r);
      } else {
        setTokens(readTokens());
      }
    } catch {
      setTokens(readTokens());
    }
    setReady(true);
  }, [readTokens]);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
    root.style.setProperty("--radius-selector", `${radii.selector / 16}rem`);
    root.style.setProperty("--radius-field", `${radii.field / 16}rem`);
    root.style.setProperty("--radius-box", `${radii.box / 16}rem`);
    document.body.style.fontFamily = font;
    const gf = GOOGLE_FONTS[font];
    if (gf) {
      const id = "ds-gfont";
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${gf}:wght@400;500;600;700&display=swap`;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens, font, radii }));
  }, [tokens, font, radii, ready]);

  function updateToken(key: string, value: string) {
    setTokens((prev) => ({ ...prev, [key]: value }));
  }

  function resetToDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    const root = document.documentElement;
    for (const group of TOKEN_GROUPS) for (const { key } of group.tokens) root.style.removeProperty(key);
    root.style.removeProperty("--radius-selector");
    root.style.removeProperty("--radius-field");
    root.style.removeProperty("--radius-box");
    document.body.style.fontFamily = "";
    setTokens(readTokens());
    setFont(FONT_OPTIONS[0].value);
    setRadii({ selector: 8, field: 6, box: 12 });
  }

  function generateCss() {
    const colorLines = [
      ["/* Backgrounds */", ["--color-base-100", "--color-base-200", "--color-base-300", "--color-base-content"]],
      [
        "/* Brand */",
        [
          "--color-primary",
          "--color-primary-content",
          "--color-secondary",
          "--color-secondary-content",
          "--color-accent",
          "--color-accent-content",
        ],
      ],
      ["/* Neutral */", ["--color-neutral", "--color-neutral-content"]],
      ["/* Semantic */", ["--color-info", "--color-success", "--color-warning", "--color-error"]],
    ] as [string, string[]][];

    const body = colorLines
      .map(([comment, keys]) => {
        const rows = keys.map((k) => `  ${k}: ${hexToOklch(tokens[k] ?? "#000000")};`).join("\n");
        return `  ${comment}\n${rows}`;
      })
      .join("\n\n");

    const fontLine = font !== FONT_OPTIONS[0].value ? `\nbody {\n  font-family: ${font};\n}\n` : "";

    return `/*
  ============================================================
  HAUST COLOR TOKENS — generated from Design System editor
  Paste into app/colors.css
  ============================================================
*/${fontLine}
[data-theme="haust"] {
  color-scheme: dark;

${body}

  /* Shape */
  --radius-selector: ${radii.selector / 16}rem;
  --radius-field: ${radii.field / 16}rem;
  --radius-box: ${radii.box / 16}rem;
}`;
  }

  async function copyExport() {
    await navigator.clipboard.writeText(generateCss());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ready) {
    return (
      <div className="bg-base-200 flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-base-200 min-h-screen">
      {/* Header */}
      <header className="border-base-300 bg-base-100/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">Design System</span>
            <span className="badge badge-primary badge-sm font-mono">haust</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetToDefaults} className="btn btn-ghost btn-sm">
              Reset
            </button>
            <button onClick={() => setShowExport(true)} className="btn btn-primary btn-sm">
              Export CSS
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-screen-xl grid-cols-[300px_1fr] gap-6 px-6 py-8">
        {/* ── Sidebar: token editor ───────────────────────────── */}
        <aside className="sticky top-24 space-y-4 self-start">
          {TOKEN_GROUPS.map((group) => (
            <div key={group.id} className="border-base-300 bg-base-100 rounded-xl border p-4">
              <p className="text-base-content/40 mb-3 text-[10px] font-semibold tracking-widest uppercase">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.tokens.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-base-content/80 flex-1 truncate text-sm">{label}</span>
                    <span className="text-base-content/25 w-14 truncate text-right font-mono text-[10px]">
                      {tokens[key] ?? ""}
                    </span>
                    <input
                      type="color"
                      value={tokens[key] ?? "#000000"}
                      onChange={(e) => updateToken(key, e.target.value)}
                      className="border-base-300 h-7 w-9 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                      title={key}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Typography */}
          <div className="border-base-300 bg-base-100 rounded-xl border p-4">
            <p className="text-base-content/40 mb-3 text-[10px] font-semibold tracking-widest uppercase">Typography</p>
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              className="select select-bordered select-sm w-full"
            >
              {FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Radii */}
          <div className="border-base-300 bg-base-100 rounded-xl border p-4">
            <p className="text-base-content/40 mb-3 text-[10px] font-semibold tracking-widest uppercase">
              Border Radius
            </p>
            <div className="space-y-4">
              {[
                { key: "selector" as const, label: "Chips / Tabs" },
                { key: "field" as const, label: "Inputs / Buttons" },
                { key: "box" as const, label: "Cards / Modals" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-base-content/80 text-sm">{label}</span>
                    <span className="text-base-content/40 font-mono text-[10px]">{radii[key]}px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={32}
                      value={radii[key]}
                      onChange={(e) => setRadii((r) => ({ ...r, [key]: Number(e.target.value) }))}
                      className="range range-primary range-xs flex-1"
                    />
                    <div
                      className="border-primary h-7 w-7 shrink-0 border-2"
                      style={{ borderRadius: `${radii[key]}px` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main: live preview ──────────────────────────────── */}
        <main className="space-y-5" style={{ fontFamily: font }}>
          {/* Palette */}
          <section className="border-base-300 bg-base-100 rounded-xl border p-5">
            <p className="text-base-content/40 mb-4 text-[10px] font-semibold tracking-widest uppercase">
              Color Palette
            </p>
            <div className="grid grid-cols-6 gap-3">
              {[
                "--color-primary",
                "--color-secondary",
                "--color-accent",
                "--color-neutral",
                "--color-base-100",
                "--color-base-200",
                "--color-base-300",
                "--color-base-content",
                "--color-info",
                "--color-success",
                "--color-warning",
                "--color-error",
              ].map((key) => (
                <div key={key}>
                  <div className="h-10 rounded-lg border border-white/5" style={{ background: `var(${key})` }} />
                  <p className="text-base-content/50 mt-1 truncate text-[10px]">{key.replace("--color-", "")}</p>
                  <p className="text-base-content/25 font-mono text-[9px]">{tokens[key]}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="border-base-300 bg-base-100 rounded-xl border p-5">
            <p className="text-base-content/40 mb-4 text-[10px] font-semibold tracking-widest uppercase">
              Typography — {FONT_OPTIONS.find((f) => f.value === font)?.label}
            </p>
            <div className="space-y-2">
              <p className="text-5xl font-bold">Display</p>
              <p className="text-3xl font-semibold">Heading H1</p>
              <p className="text-xl font-medium">Heading H2</p>
              <p className="text-base-content/80 text-base">Body — The quick brown fox. 0x1A2B3C4D5E</p>
              <p className="text-base-content/50 text-sm">Caption — Supporting text, timestamps</p>
              <p className="text-base-content/60 font-mono text-sm">0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045</p>
            </div>
          </section>

          {/* Buttons */}
          <section className="border-base-300 bg-base-100 rounded-xl border p-5">
            <p className="text-base-content/40 mb-4 text-[10px] font-semibold tracking-widest uppercase">Buttons</p>
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-accent">Accent</button>
              <button className="btn btn-neutral">Neutral</button>
              <button className="btn btn-ghost">Ghost</button>
              <button className="btn btn-outline btn-primary">Outlined</button>
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-error">Danger</button>
              <button className="btn btn-primary" disabled>
                Disabled
              </button>
            </div>
          </section>

          {/* Cards */}
          <section className="border-base-300 bg-base-100 rounded-xl border p-5">
            <p className="text-base-content/40 mb-4 text-[10px] font-semibold tracking-widest uppercase">Cards</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-base-200">
                <div className="card-body gap-2">
                  <h2 className="card-title text-base">Safe Dashboard</h2>
                  <p className="text-base-content/60 text-sm">Manage your multisig assets and pending transactions</p>
                  <div className="card-actions mt-1">
                    <button className="btn btn-primary btn-sm">Open Safe</button>
                    <button className="btn btn-ghost btn-sm">Cancel</button>
                  </div>
                </div>
              </div>
              <div className="card border-primary/20 bg-base-200 border">
                <div className="card-body gap-2">
                  <div className="flex items-center justify-between">
                    <h2 className="card-title text-base">New Transaction</h2>
                    <span className="badge badge-primary badge-sm">2/3</span>
                  </div>
                  <p className="text-base-content/60 text-sm">Waiting for owner signatures</p>
                  <div className="card-actions mt-1">
                    <button className="btn btn-outline btn-primary btn-sm">Sign</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Forms */}
          <section className="border-base-300 bg-base-100 rounded-xl border p-5">
            <p className="text-base-content/40 mb-4 text-[10px] font-semibold tracking-widest uppercase">
              Form Elements
            </p>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <input type="text" placeholder="Wallet address 0x..." className="input input-bordered w-full" />
                <input type="text" placeholder="Focused state" className="input input-bordered input-primary w-full" />
                <select className="select select-bordered w-full">
                  <option>Haust Network</option>
                  <option>Ethereum</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
                  <span className="text-sm">Confirm transaction</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" name="r" className="radio radio-primary" defaultChecked />
                  <span className="text-sm">1 of 3 signers</span>
                </label>
                <div>
                  <div className="text-base-content/40 mb-1 flex justify-between text-xs">
                    <span>Signatures</span>
                    <span>2 / 3</span>
                  </div>
                  <progress className="progress progress-primary w-full" value={66} max={100} />
                </div>
              </div>
            </div>
          </section>

          {/* Badges & Alerts */}
          <section className="border-base-300 bg-base-100 rounded-xl border p-5">
            <p className="text-base-content/40 mb-4 text-[10px] font-semibold tracking-widest uppercase">
              Badges & Alerts
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-primary">Primary</span>
                <span className="badge badge-secondary">Secondary</span>
                <span className="badge badge-accent">Accent</span>
                <span className="badge badge-neutral">Neutral</span>
                <span className="badge badge-outline">Outline</span>
                <span className="badge badge-success">Success</span>
                <span className="badge badge-warning">Warning</span>
                <span className="badge badge-error">Error</span>
              </div>
              <div role="alert" className="alert alert-info py-2 text-sm">
                Transaction pending — 2/3 signatures collected
              </div>
              <div role="alert" className="alert alert-success py-2 text-sm">
                Transaction executed on block #4821044
              </div>
              <div role="alert" className="alert alert-error py-2 text-sm">
                Insufficient gas — please increase the limit
              </div>
            </div>
          </section>

          {/* Navbar */}
          <section className="border-base-300 bg-base-100 rounded-xl border p-5">
            <p className="text-base-content/40 mb-4 text-[10px] font-semibold tracking-widest uppercase">Navbar</p>
            <div className="navbar bg-base-200 rounded-lg px-4">
              <div className="flex-1">
                <a className="btn btn-ghost text-base font-bold">Haust Safe</a>
              </div>
              <div className="flex-none gap-2">
                <span className="badge badge-primary badge-sm">Haust Network</span>
                <button className="btn btn-outline btn-sm">Connect</button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="modal modal-open" onClick={() => setShowExport(false)}>
          <div className="modal-box w-11/12 max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold">Export → app/colors.css</h3>
            <p className="text-base-content/50 mb-3 text-sm">
              Paste into <code className="bg-base-300 text-primary rounded px-1 font-mono text-xs">app/colors.css</code>{" "}
              to apply across the app.
            </p>
            <textarea
              readOnly
              value={generateCss()}
              className="textarea textarea-bordered h-72 w-full font-mono text-xs"
            />
            <div className="modal-action">
              <button onClick={copyExport} className="btn btn-primary">
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              <button onClick={() => setShowExport(false)} className="btn btn-ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
