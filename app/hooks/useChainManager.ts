import { useState } from "react";
import { createPublicClient, defineChain, http, Chain } from "viem";
import { CustomChainInput, DetectedChainResult } from "../utils/types";
import * as viemChains from "viem/chains";
import { useWagmiConfigContext } from "../provider/WagmiConfigProvider";

/**
 * Create a custom chain object compatible with viem's Chain type.
 *
 * @param {CustomChainInput} input - The input parameters for the custom chain.
 * @returns {Chain} - The constructed Chain object.
 */
export function createChain(input: CustomChainInput) {
  return defineChain({
    id: input.id,
    name: input.name,
    nativeCurrency: input.nativeCurrency,
    rpcUrls: {
      default: {
        http: [input.rpcUrl],
      },
    },
    blockExplorers: input.blockExplorerUrl
      ? {
          default: {
            name: input.blockExplorerName || "Explorer",
            url: input.blockExplorerUrl,
          },
        }
      : undefined,
    contracts: input.contracts,
  });
}

/**
 * Get a viem Chain object by its chain ID.
 *
 * @param {number} chainId - The ID of the chain to retrieve.
 * @returns {Chain | undefined} - The corresponding Chain object or undefined if not found.
 */
export function getViemChainFromId(chainId: number): Chain | undefined {
  return Object.values(viemChains).find((chain) => chain.id === chainId);
}

/**
 * Detect the chain information from a given RPC URL.
 *
 * @param {string} rpcUrl - The RPC URL to detect the chain from.
 * @returns {Promise<DetectedChainResult>} - A promise that resolves to the detected chain information.
 * @throws Will throw an error if the chain cannot be detected.
 */
export async function detectChainFromRpc(rpcUrl: string): Promise<DetectedChainResult> {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const chainId = await client.getChainId();
  // Try to find a matching chain in viem/chains
  const found = getViemChainFromId(chainId);
  if (found) {
    return {
      chain: {
        ...found,
        rpcUrls: { default: { http: [rpcUrl] } },
      },
      isCustom: false,
    };
  } else {
    // Always return a valid Chain type
    const customChain: Chain = createChain({
      id: chainId,
      name: `Custom Chain ${chainId}`,
      nativeCurrency: { name: "Unknown", symbol: "UNKNOWN", decimals: 18 },
      rpcUrl: rpcUrl,
    });
    return {
      chain: customChain,
      isCustom: true,
    };
  }
}

/**
 * Hook to manage user-configured chains.
 *
 * @returns An object containing the configured chains and functions to manage them.
 */
export function useChainManager() {
  const { configChains, setConfigChains } = useWagmiConfigContext();
  const [error, setError] = useState<string | null>(null);
  const [detectedChain, setDetectedChain] = useState<DetectedChainResult | null>(null);
  const [detecting, setDetecting] = useState<boolean>(false);

  // Add or update a chain
  const addOrUpdateChain = (chain: Chain) => {
    setConfigChains((prev) => {
      const filtered = prev.filter((c) => c.id !== chain.id);
      return [...filtered, chain];
    });
  };

  // Remove a chain by id
  const removeChainById = (chainId: number) => {
    setConfigChains((prev) => prev.filter((c) => c.id !== chainId));
  };

  // Detect chain from RPC
  const detectChain = async (rpcUrl: string) => {
    setDetecting(true);
    setError(null);
    setDetectedChain(null);
    try {
      const result = await detectChainFromRpc(rpcUrl);
      setDetectedChain(result);
      setError(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message || "Failed to detect chain");
      } else {
        setError("Failed to detect chain");
      }
    } finally {
      setDetecting(false);
    }
  };

  return {
    configChains,
    addOrUpdateChain,
    removeChainById,
    getViemChainFromId,
    detectChain,
    detectedChain,
    detecting,
    error,
  };
}
