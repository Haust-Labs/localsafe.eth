import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { ContractAbiResult, fetchContractAbi } from "@/app/utils/explorerAbi";

export type ContractAbiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | ({ status: "done" } & ContractAbiResult);

export default function useContractAbi(explorerUrl: string | undefined, address: string): ContractAbiState {
  const [state, setState] = useState<ContractAbiState>({ status: "idle" });
  const target = address.trim();
  const enabled = !!explorerUrl && isAddress(target, { strict: false });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    fetchContractAbi(explorerUrl!, target)
      .then((result) => {
        if (!cancelled) setState({ status: "done", ...result });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, explorerUrl, target]);

  return state;
}
