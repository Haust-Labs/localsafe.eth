import { useEffect, useMemo, useState } from "react";
import { erc20Abi, isAddress } from "viem";
import { usePublicClient } from "wagmi";
import { Erc20Option, fetchErc20Balances } from "@/app/utils/explorerTokens";

export type Erc20TokenState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; symbol: string; decimals: number; balance: bigint };

/**
 * Tokens the Safe holds per the explorer, merged with tokens saved in the Assets section.
 */
export function useSafeTokenOptions(
  explorerUrl: string | undefined,
  safeAddress: string,
  chainId: string | undefined,
): { options: Erc20Option[]; loading: boolean } {
  const [explorerTokens, setExplorerTokens] = useState<Erc20Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!explorerUrl) return;

    let cancelled = false;
    setLoading(true);
    fetchErc20Balances(explorerUrl, safeAddress)
      .then((tokens) => {
        if (!cancelled) setExplorerTokens(tokens);
      })
      .catch(() => {
        if (!cancelled) setExplorerTokens([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [explorerUrl, safeAddress]);

  const options = useMemo(() => {
    const byAddress = new Map<string, Erc20Option>();
    for (const token of explorerTokens) byAddress.set(token.address.toLowerCase(), token);

    // Same key TokenBalancesSection persists its token list under.
    try {
      const saved = JSON.parse(localStorage.getItem(`token-balances-${safeAddress}-${chainId}`) ?? "[]");
      for (const token of Array.isArray(saved) ? saved : []) {
        if (typeof token?.address === "string" && !byAddress.has(token.address.toLowerCase())) {
          byAddress.set(token.address.toLowerCase(), {
            address: token.address,
            symbol: token.symbol ?? "???",
            name: token.name,
            decimals: token.decimals,
          });
        }
      }
    } catch {
      // Corrupt or unavailable storage: explorer list alone is fine.
    }

    return [...byAddress.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [explorerTokens, safeAddress, chainId]);

  return { options, loading };
}

/**
 * Reads symbol, decimals and the Safe's balance for an ERC-20 directly from the chain.
 */
export function useErc20Token(tokenAddress: string, holder: string): Erc20TokenState {
  const publicClient = usePublicClient();
  const [state, setState] = useState<Erc20TokenState>({ status: "idle" });
  const token = tokenAddress.trim();
  const enabled = !!publicClient && isAddress(token, { strict: false });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    const address = token as `0x${string}`;
    setState({ status: "loading" });
    Promise.all([
      publicClient!.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
      publicClient!.readContract({
        address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [holder as `0x${string}`],
      }),
      publicClient!.readContract({ address, abi: erc20Abi, functionName: "symbol" }).catch(() => "???"),
    ])
      .then(([decimals, balance, symbol]) => {
        if (!cancelled) setState({ status: "ready", decimals, balance, symbol });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", error: "Not an ERC-20 token on this network" });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, publicClient, token, holder]);

  return state;
}
