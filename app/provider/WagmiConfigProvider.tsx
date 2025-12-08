"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Chain } from "wagmi/chains";
import { WAGMI_CONFIG_NETWORKS_KEY } from "../utils/constants";
import { WagmiProvider } from "wagmi";
import { fallback, injected, unstable_connector } from "@wagmi/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, lightTheme, darkTheme, connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
  ledgerWallet,
  oneKeyWallet,
  rabbyWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import ethereumIcon from "../assets/chainIcons/ethereum.svg";

// Helper to add icon URLs to chains
const addChainIcon = (chain: Chain, iconUrl: string): Chain =>
  ({
    ...chain,
    iconUrl,
  }) as Chain;

// Haust Mainnet configuration
const haustMainnet = defineChain({
  id: 3864,
  name: "Haust Network",
  nativeCurrency: {
    name: "HAUST",
    symbol: "HAUST",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://haust-network-rpc.eu-north-2.gateway.fm/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Haust Blockscout",
      url: "https://haustscan.com",
    },
  },
});

// Default chains - only Haust Mainnet
const DEFAULT_CHAINS: Chain[] = [
  addChainIcon(haustMainnet, ethereumIcon.src), // Using ethereum icon as placeholder
];

export interface WagmiConfigContextType {
  configChains: Chain[];
  setConfigChains: React.Dispatch<React.SetStateAction<Chain[]>>;
  wagmiConfig: ReturnType<typeof createConfig>;
}

const WagmiConfigContext = createContext<WagmiConfigContextType | undefined>(undefined);

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
      // Always use DEFAULT_CHAINS (Haust Mainnet only) and clear any stored networks
      setConfigChains(DEFAULT_CHAINS);
      // Clear localStorage to remove old networks
      localStorage.removeItem(WAGMI_CONFIG_NETWORKS_KEY);
      setChainsLoaded(true);
    }
  }, []);

  // Save chains to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && chainsLoaded) {
      localStorage.setItem(WAGMI_CONFIG_NETWORKS_KEY, JSON.stringify(configChains));
    }
  }, [configChains, chainsLoaded]);

  // Compute wagmi config from chains - only on client side
  const wagmiConfig = useMemo(() => {
    if (!isMounted) return null;

    // Create transports object that uses wallet provider's RPC (EIP-1193)
    // This ensures we use the user's wallet RPC instead of public RPC endpoints
    const transports = configChains.reduce(
      (acc, chain) => {
        // Fallback to chain's RPC URL if connector doesn't respond
        const rpcUrl = chain.rpcUrls.default.http[0];
        acc[chain.id] = fallback([unstable_connector(injected), http(rpcUrl)]);
        return acc;
      },
      {} as Record<number, ReturnType<typeof fallback>>,
    );

    // Configure wallets explicitly to exclude Coinbase Wallet (which phones home)
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Popular",
          wallets: [metaMaskWallet, rabbyWallet, rainbowWallet, phantomWallet],
        },
        {
          groupName: "Hardware",
          wallets: [ledgerWallet, oneKeyWallet],
        },
        {
          groupName: "More",
          wallets: [walletConnectWallet, injectedWallet],
        },
      ],
      {
        appName: "localsafe.eth",
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      },
    );

    return createConfig({
      chains: configChains as [typeof haustMainnet, ...[typeof haustMainnet]],
      connectors,
      transports,
      ssr: false,
    });
  }, [configChains, isMounted]);

  const [queryClient] = useState(() => new QueryClient());

  // Don't render providers until client-side mounted
  if (!isMounted || !wagmiConfig) {
    return null;
  }

  return (
    <WagmiConfigContext.Provider value={{ configChains, setConfigChains, wagmiConfig }}>
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
  if (!ctx) throw new Error("useWagmiConfigContext must be used within a WagmiConfigProvider");
  return ctx;
}
