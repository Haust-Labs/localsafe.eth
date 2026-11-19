"use client";

import packageJson from "../../package.json";

export default function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || "0.0.0";

  return (
    <footer className="footer bg-base-100 w-full border-t border-white/20 px-4 py-4">
      <div className="container mx-auto flex items-center justify-end">
        <span className="text-base-content text-sm opacity-60">v{version}</span>
      </div>
    </footer>
  );
}
