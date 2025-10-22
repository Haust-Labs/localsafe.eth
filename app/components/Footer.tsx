"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import GithubSvg from "../assets/svg/GithubSvg";
import poweredByCyfrinDark from "../assets/svg/powered-by-cyfrin-dark.png";
import poweredByCyfrinBright from "../assets/svg/powered-by-cyfrin-bright.png";
import packageJson from "../../package.json";

export default function Footer() {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const version =
    process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || "0.0.0";

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setIsDarkTheme(theme === "dark");
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <footer className="footer bg-base-200 border-base-100 w-full border-t px-4 py-4">
      <div className="container mx-auto flex items-center justify-between">
        {/* Left side - empty for now */}
        <div className="flex-1"></div>

        {/* Center - Powered by Cyfrin logo */}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="https://www.cyfrin.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <Image
              src={isDarkTheme ? poweredByCyfrinDark : poweredByCyfrinBright}
              alt="Powered by Cyfrin"
              height={32}
            />
          </Link>
        </div>

        {/* Right side - Version and GitHub link */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="text-base-content text-sm opacity-60">
            v{version}
          </span>
          <Link
            href="https://github.com/Cyfrin/localsafe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base-content transition-opacity hover:opacity-70"
            aria-label="View source on GitHub"
          >
            <GithubSvg />
          </Link>
        </div>
      </div>
    </footer>
  );
}
