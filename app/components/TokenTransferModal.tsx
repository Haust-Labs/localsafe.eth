"use client";

import React, { useState } from "react";
import Modal from "./Modal";
import { useRouter } from "next/navigation";
import { encodeFunctionData, parseUnits } from "viem";
import useSafe from "@/app/hooks/useSafe";

interface TokenTransferModalProps {
  open: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenBalance: string;
  safeAddress: string;
}

const ERC20_TRANSFER_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
] as const;

export default function TokenTransferModal({
  open,
  onClose,
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  tokenBalance,
  safeAddress,
}: TokenTransferModalProps) {
  const router = useRouter();
  const { buildSafeTransaction, getSafeTransactionHash, safeInfo } = useSafe(safeAddress as `0x${string}`);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [customNonce, setCustomNonce] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  async function handleTransfer() {
    setError(null);

    // Validate recipient address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setError("Invalid recipient address");
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    // Check balance
    const balanceNum = parseFloat(tokenBalance);
    if (amountNum > balanceNum) {
      setError(`Insufficient balance. You have ${balanceNum} ${tokenSymbol}`);
      return;
    }

    setIsBuilding(true);

    try {
      // Convert amount to wei/token units
      const amountInUnits = parseUnits(amount, tokenDecimals);

      // Encode the transfer function call
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [recipient as `0x${string}`, amountInUnits],
      });

      // Parse custom nonce if provided
      const nonce = customNonce ? parseInt(customNonce, 10) : undefined;
      if (customNonce && (isNaN(nonce!) || nonce! < 0)) {
        setError("Invalid nonce value");
        setIsBuilding(false);
        return;
      }

      // Build the Safe transaction
      const safeTx = await buildSafeTransaction([
        {
          to: tokenAddress,
          value: "0",
          data: data,
          operation: 0,
        },
      ], nonce);

      if (!safeTx) {
        setError("Failed to build transaction");
        setIsBuilding(false);
        return;
      }

      // Get transaction hash
      const hash = await getSafeTransactionHash(safeTx);

      // Navigate to the transaction signing page
      router.push(`/safe/${safeAddress}/tx/${hash}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transfer transaction");
      setIsBuilding(false);
    }
  }

  function handleMaxClick() {
    setAmount(tokenBalance);
  }

  function handleClose() {
    setRecipient("");
    setAmount("");
    setCustomNonce("");
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} showCloseButton={false}>
      <h2 className="mb-4 text-2xl font-bold">Transfer {tokenSymbol}</h2>

      <div className="mb-4">
        <p className="text-sm opacity-70">
          Token: <span className="font-mono">{tokenAddress}</span>
        </p>
        <p className="text-sm opacity-70">
          Available:{" "}
          <span className="font-semibold">
            {parseFloat(tokenBalance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{" "}
            {tokenSymbol}
          </span>
        </p>
      </div>

      {/* Recipient Input */}
      <div className="mb-4">
        <label className="label">
          <span className="label-text font-semibold">Recipient Address</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full font-mono text-sm"
          placeholder="0x..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          pattern="^0x[a-fA-F0-9]{40}$"
        />
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="label">
          <span className="label-text font-semibold">Amount</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1 font-mono text-sm"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={handleMaxClick}
          >
            Max
          </button>
        </div>
      </div>

      {/* Nonce Input */}
      <div className="mb-4">
        <label className="label">
          <span className="label-text">Custom Nonce (optional, current: {safeInfo?.nonce ?? "-"})</span>
        </label>
        <input
          type="number"
          className="input input-bordered input-sm w-full"
          placeholder={`Leave empty for current nonce (${safeInfo?.nonce ?? ""})`}
          value={customNonce}
          onChange={(e) => setCustomNonce(e.target.value)}
          min="0"
        />
      </div>

      {error && <div className="alert alert-error mb-4 text-sm">{error}</div>}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost btn-sm" onClick={handleClose} disabled={isBuilding}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleTransfer}
          disabled={!recipient || !amount || isBuilding}
        >
          {isBuilding ? "Creating Transaction..." : "Create Transfer Transaction"}
        </button>
      </div>
    </Modal>
  );
}
