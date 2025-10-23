"use client";

import { useEffect, useRef } from "react";
import { useWalletConnect } from "../provider/WalletConnectProvider";
import { useRouter, useParams } from "next/navigation";
import useSafe from "../hooks/useSafe";
import { useAccount } from "wagmi";

/**
 * WalletConnectRequestHandler component that monitors for WalletConnect transaction requests
 * and redirects to the transaction builder when a request is received.
 */
export default function WalletConnectRequestHandler() {
  const { pendingRequest, approveRequest, rejectRequest } = useWalletConnect();
  const router = useRouter();
  const { address: safeAddress } = useParams<{ address?: `0x${string}` }>();
  const { buildSafeTransaction } = useSafe(safeAddress || ("0x0" as `0x${string}`));
  const { chain } = useAccount();
  const processedRequestIds = useRef(new Set<number>());

  useEffect(() => {
    if (!pendingRequest) return;
    if (processedRequestIds.current.has(pendingRequest.id)) return;

    const { topic, params } = pendingRequest;
    const { request } = params;

    // Handle eth_sendTransaction
    if (request.method === "eth_sendTransaction") {
      processedRequestIds.current.add(pendingRequest.id);

      if (!safeAddress) {
        alert("Please navigate to a Safe before sending transactions via WalletConnect");
        return;
      }

      const [txParams] = request.params as any[];

      // Navigate to a WalletConnect transaction handling page
      // We'll store the request in sessionStorage so the transaction page can access it
      if (typeof window !== "undefined") {
        sessionStorage.setItem("wc-pending-request", JSON.stringify(pendingRequest));
      }

      // Navigate to the Safe's WalletConnect transaction page
      router.push(`/safe/${safeAddress}/wc-tx`);
    }

    // Handle other methods like eth_signTypedData, eth_sign, personal_sign, etc.
    else if (
      request.method === "eth_signTypedData" ||
      request.method === "eth_signTypedData_v4" ||
      request.method === "personal_sign" ||
      request.method === "eth_sign"
    ) {
      processedRequestIds.current.add(pendingRequest.id);

      if (!safeAddress) {
        alert("Please navigate to a Safe before signing messages via WalletConnect");
        return;
      }

      // Store in sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("wc-pending-request", JSON.stringify(pendingRequest));
      }

      // Navigate to the Safe's WalletConnect signing page
      router.push(`/safe/${safeAddress}/wc-sign`);
    }
  }, [pendingRequest, router, safeAddress]);

  return null; // This component doesn't render anything
}
