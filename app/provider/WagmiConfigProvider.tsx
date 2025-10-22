"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Chain } from "wagmi/chains";
import { WAGMI_CONFIG_NETWORKS_KEY } from "../utils/constants";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  lightTheme,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  sepolia,
  anvil,
  gnosis,
  polygon,
  polygonZkEvm,
  bsc,
  optimism,
  base,
  linea,
  scroll,
  celo,
  avalanche,
  mantle,
  aurora,
  arbitrum,
  baseSepolia,
  zkSync,
  zora,
} from "wagmi/chains";
import polygonZkEvmIcon from "../assets/chainlogos/polygon-zkevm.webp";
import zkSyncIcon from "../assets/chainlogos/zksync-era.webp";
import zoraIcon from "../assets/chainlogos/zora.webp";
import scrollIcon from "../assets/chainlogos/scroll.webp";
import lineaIcon from "../assets/chainlogos/linea.webp";
import gnosisIcon from "../assets/chainlogos/gnosis.webp";
import binanceIcon from "../assets/chainlogos/binance.webp";
import avaxIcon from "../assets/chainlogos/avax.webp";
import celoIcon from "../assets/chainlogos/celo.webp";
import mantleIcon from "../assets/chainlogos/mantle.webp";
import auroraIcon from "../assets/chainlogos/aurora.webp";

// Helper to add icon URLs to chains (only for chains that don't already have icons)
const addChainIcon = (chain: Chain, iconUrl: string, iconBackground?: string): Chain => ({
  ...chain,
  iconUrl,
  iconBackground: iconBackground || "transparent",
} as Chain);

// Default icon URL for chains without logos (embedded SVG)
const DEFAULT_CHAIN_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Ccircle cx='12' cy='12' r='10' fill='%239CA3AF'/%3E%3Ccircle cx='5' cy='12' r='2' fill='white'/%3E%3Ccircle cx='19' cy='12' r='2' fill='white'/%3E%3Ccircle cx='12' cy='5' r='2' fill='white'/%3E%3Ccircle cx='12' cy='19' r='2' fill='white'/%3E%3Cline x1='12' y1='7' x2='12' y2='17' stroke='white' stroke-width='1.5'/%3E%3Cline x1='7' y1='12' x2='17' y2='12' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E";

// Default chains that should always be available
// Note: mainnet, arbitrum, optimism, base, polygon, sepolia, baseSepolia already have RainbowKit icons
const DEFAULT_CHAINS: Chain[] = [
  mainnet,
  // L2s and scaling solutions
  arbitrum,
  optimism,
  base,
  polygon,
  addChainIcon(polygonZkEvm, polygonZkEvmIcon.src, "#8247e5"),
  addChainIcon(zkSync, zkSyncIcon.src),
  addChainIcon(zora, zoraIcon.src),
  addChainIcon(scroll, scrollIcon.src, "#ffeeda"),
  addChainIcon(linea, lineaIcon.src),
  // Other mainnets
  addChainIcon(gnosis, gnosisIcon.src, "#04795b"),
  addChainIcon(bsc, binanceIcon.src, "#f3ba2f"),
  addChainIcon(avalanche, avaxIcon.src, "#e84142"),
  addChainIcon(celo, celoIcon.src, "#fcff52"),
  addChainIcon(mantle, mantleIcon.src),
  addChainIcon(aurora, auroraIcon.src, "#70d44b"),
  // Testnets
  sepolia,
  baseSepolia,
  // Local dev
  addChainIcon(anvil, DEFAULT_CHAIN_ICON, "#1e1e1e"),
];

export interface WagmiConfigContextType {
  configChains: Chain[];
  setConfigChains: React.Dispatch<React.SetStateAction<Chain[]>>;
  wagmiConfig: ReturnType<typeof getDefaultConfig>;
}

const WagmiConfigContext = createContext<WagmiConfigContextType | undefined>(
  undefined,
);

export const WagmiConfigProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [configChains, setConfigChains] = useState<Chain[]>(DEFAULT_CHAINS);

  const [chainsLoaded, setChainsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're on the client side before initializing
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load chains from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(WAGMI_CONFIG_NETWORKS_KEY);
      if (stored) {
        try {
          setConfigChains(JSON.parse(stored));
        } catch {
          setConfigChains(DEFAULT_CHAINS);
        }
      } else {
        setConfigChains(DEFAULT_CHAINS);
      }
      setChainsLoaded(true);
    }
  }, []);

  // Save chains to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && chainsLoaded) {
      localStorage.setItem(
        WAGMI_CONFIG_NETWORKS_KEY,
        JSON.stringify(configChains),
      );
    }
  }, [configChains, chainsLoaded]);

  // Compute wagmi config from chains - only on client side
  const wagmiConfig = useMemo(() => {
    if (!isMounted) return null;

    return getDefaultConfig({
      appName: "localsafe.eth",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      chains: configChains as [typeof mainnet, ...[typeof mainnet]],
      ssr: false,
    });
  }, [configChains, isMounted]);

  const [queryClient] = useState(() => new QueryClient());

  // Don't render providers until client-side mounted
  if (!isMounted || !wagmiConfig) {
    return null;
  }

  return (
    <WagmiConfigContext.Provider
      value={{ configChains, setConfigChains, wagmiConfig }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={{
              lightMode: lightTheme({
                accentColor: "#605dff",
                accentColorForeground: "white",
              }),
              darkMode: darkTheme({
                accentColor: "#605dff",
                accentColorForeground: "white",
              }),
            }}
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </WagmiConfigContext.Provider>
  );
};

export function useWagmiConfigContext() {
  const ctx = useContext(WagmiConfigContext);
  if (!ctx)
    throw new Error(
      "useWagmiConfigContext must be used within a WagmiConfigProvider",
    );
  return ctx;
}
