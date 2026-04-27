"use client";

import { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext<undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "haust");
  }, []);

  return <ThemeContext.Provider value={undefined}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return { isDarkMode: true, setIsDarkMode: () => {} };
}
