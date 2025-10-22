"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import NetworkModal from "./NetworkModal";
import CustomConnectButton from "./CustomConnectButton";
import { useAccount } from "wagmi";
import { useChainManager } from "../hooks/useChainManager";
import { NetworkFormState } from "../utils/types";
import SunSvg from "../assets/svg/SunSvg";
import MoonSvg from "../assets/svg/MoonSvg";

export default function NavBar() {
  const { isConnected, chain, connector } = useAccount();
  const { configChains, getViemChainFromId } = useChainManager();

  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [showNetworkFormIndicator, setShowNetworkFormIndicator] =
    useState(false);
  const [suggestedFormState, setSuggestedFormState] = useState<
    NetworkFormState | undefined
  >(undefined);

  const handleOpenNetworkModal = () => setNetworkModalOpen(true);
  const handleCloseNetworkModal = () => setNetworkModalOpen(false);

  // Callback to check the chain against configChains and viewm chains
  const checkChain = useCallback(async () => {
    if (!isConnected || !connector || chain) {
      setShowNetworkFormIndicator(false);
      setSuggestedFormState(undefined);
      return;
    }
    const chainId = await connector.getChainId();
    const found = configChains.find(
      (configChain) => Number(chainId) === Number(configChain.id),
    );
    if (!found) {
      setShowNetworkFormIndicator(true);
      // Try to get chain info from wagmi
      const viemChain = getViemChainFromId(chainId);
      if (viemChain) {
        setSuggestedFormState({
          id: viemChain.id,
          name: viemChain.name,
          rpcUrl: viemChain.rpcUrls.default.http[0] || "",
          blockExplorerUrl: viemChain.blockExplorers
            ? viemChain.blockExplorers.default.url
            : "",
          blockExplorerName: viemChain.blockExplorers
            ? viemChain.blockExplorers.default.name
            : "",
          nativeCurrency: viemChain.nativeCurrency || {
            name: "",
            symbol: "",
            decimals: 18,
          },
        } as NetworkFormState);
        return;
      }
      // Fallback to minimal info
      setSuggestedFormState({
        id: chainId,
        name: "Unknown",
        rpcUrl: "",
        blockExplorerUrl: "",
        blockExplorerName: "",
        nativeCurrency: {
          name: "",
          symbol: "",
          decimals: 18,
        },
      } as NetworkFormState);
    } else {
      setShowNetworkFormIndicator(false);
      setSuggestedFormState(undefined);
    }
  }, [isConnected, configChains, connector, chain, getViemChainFromId]);

  // Run checkChain on relevant changes
  useEffect(() => {
    checkChain();
  }, [checkChain]);

  return (
    <nav className="navbar bg-base-200 border-base-100 sticky top-0 z-20 w-full justify-between border-b px-1 sm:px-4">
      <div className="flex items-center">
        <Link
          className="mx-2 px-2 text-sm font-bold sm:text-xl"
          href="/accounts"
        >
          localsafe.eth
        </Link>
      </div>
      <div className="flex items-center">
        <label className="swap swap-rotate">
          <input type="checkbox" className="theme-controller" value="light" />
          <SunSvg />
          <MoonSvg />
        </label>
        <div className="divider divider-horizontal mx-1"></div>
        <CustomConnectButton
          onOpenNetworkModal={handleOpenNetworkModal}
          showNetworkFormIndicator={showNetworkFormIndicator}
          chainStatusDisplay={
            showNetworkFormIndicator
              ? "none"
              : { smallScreen: "icon", largeScreen: "full" }
          }
        />
        <NetworkModal
          open={networkModalOpen}
          onClose={handleCloseNetworkModal}
          suggestedFormState={
            showNetworkFormIndicator && suggestedFormState
              ? suggestedFormState
              : undefined
          }
        />
      </div>
    </nav>
  );
}
