"use client";

import AppSection from "@/app/components/AppSection";
import { isValidAddress } from "@/app/utils/helpers";
import AppCard from "@/app/components/AppCard";
import { useState, useEffect, useMemo } from "react";
import React from "react";
import useSafe from "@/app/hooks/useSafe";
import { useNavigate, useSearchParams } from "react-router-dom";
import BtnCancel from "@/app/components/BtnCancel";
import { useSafeTxContext } from "@/app/provider/SafeTxProvider";
import { EthSafeTransaction } from "@safe-global/protocol-kit";
import { useAccount, useChainId, useChains } from "wagmi";
import { encodeFunctionData, erc20Abi, formatUnits, parseEther, parseUnits, toFunctionSignature } from "viem";
import useContractAbi from "@/app/hooks/useContractAbi";
import { getWriteFunctions, parseAbiJson } from "@/app/utils/explorerAbi";
import { encodeCalldata } from "@/app/utils/abiEncoder";
import DataPreview from "@/app/components/DataPreview";
import { AbiFunctionInputs, ContractAbiStatus } from "@/app/components/ContractCallFields";
import Erc20TokenPicker, { CUSTOM_TOKEN, Erc20Balance } from "@/app/components/Erc20TokenPicker";
import { useErc20Token, useSafeTokenOptions } from "@/app/hooks/useErc20";

type BuilderMode = "transfer" | "erc20" | "contract";

const MODE_TITLES: Record<BuilderMode, string> = {
  transfer: "Transfer",
  erc20: "Transfer ERC20",
  contract: "Contract Interaction",
};

function parseMode(raw: string | null): BuilderMode {
  return raw === "contract" || raw === "erc20" ? raw : "transfer";
}

/**
 * Component for creating a new Safe transaction
 *
 * @returns Component for creating a new Safe transaction
 */
export default function NewSafeTxClient({ safeAddress }: { safeAddress: `0x${string}` }) {
  // Hooks
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { chain } = useAccount();
  const configChainId = useChainId();
  const chains = useChains();
  const explorerUrl = (chain ?? chains.find((c) => c.id === configChainId))?.blockExplorers?.default?.url;
  const { buildSafeTransaction, getSafeTransactionHash, isOwner, safeInfo } = useSafe(safeAddress as `0x${string}`);
  const { getAllTransactions } = useSafeTxContext();

  // Calculate chain ID for localStorage and transaction queries
  const chainId = chain?.id ? String(chain.id) : undefined;
  const storageKey = `MSIGUI_draftTx_${chainId || "unknown"}_${safeAddress}`;

  // Form state
  const mode = parseMode(searchParams.get("mode"));
  const [to, setTo] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nonceWarning, setNonceWarning] = useState<string | null>(null);
  const [showDataHex, setShowDataHex] = useState(false);
  const [abiJson, setAbiJson] = useState("");
  const [showManualAbi, setShowManualAbi] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [inputValues, setInputValues] = useState<string[]>([]);
  const [customNonce, setCustomNonce] = useState<string>("");
  const [tokenSelection, setTokenSelection] = useState("");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  // Transactions array state
  const [transactions, setTransactions] = useState<
    {
      to: string;
      value: string;
      data: string;
      operation?: number;
      method: string;
    }[]
  >([]);

  // Load form state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTo(parsed.to || "");
        setValue(parsed.value || "");
        setData(parsed.data || "");
        setShowDataHex(parsed.showDataHex || false);
        setAbiJson(parsed.abiJson || "");
        setSelectedMethod(parsed.selectedMethod || "");
        setInputValues(Array.isArray(parsed.inputValues) ? parsed.inputValues : []);
        setTransactions(parsed.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load draft transaction from localStorage:", err);
    }
  }, [storageKey]);

  // Save form state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const formState = {
      to,
      value,
      data,
      showDataHex,
      abiJson,
      selectedMethod,
      inputValues,
      transactions,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(formState));
    } catch (err) {
      console.error("Failed to save draft transaction to localStorage:", err);
    }
  }, [to, value, data, showDataHex, abiJson, selectedMethod, inputValues, transactions, storageKey]);

  const abiState = useContractAbi(mode === "contract" ? explorerUrl : undefined, to);
  const fetchedAbi = abiState.status === "done" && abiState.kind === "verified" ? abiState.abi : null;
  const manualAbi = useMemo(() => (abiJson.trim() ? parseAbiJson(abiJson) : null), [abiJson]);
  const manualAbiVisible = showManualAbi || !fetchedAbi;
  const activeAbi = manualAbiVisible && manualAbi ? manualAbi : fetchedAbi;

  const writeFunctions = useMemo(
    () =>
      (activeAbi ? getWriteFunctions(activeAbi) : [])
        .map((fn) => ({ fn, signature: toFunctionSignature(fn) }))
        .sort((a, b) => a.signature.localeCompare(b.signature)),
    [activeAbi],
  );
  const selectedFn = writeFunctions.find((f) => f.signature === selectedMethod)?.fn;
  const isPayable = selectedFn?.stateMutability === "payable" || (selectedFn as { payable?: boolean })?.payable;
  const showValue = mode === "transfer" || (mode === "contract" && (showDataHex || !!isPayable));

  const { options: tokenOptions, loading: tokenOptionsLoading } = useSafeTokenOptions(
    mode === "erc20" ? explorerUrl : undefined,
    safeAddress,
    chainId,
  );
  const tokenAddress = tokenSelection === CUSTOM_TOKEN ? customTokenAddress : tokenSelection;
  const token = useErc20Token(mode === "erc20" ? tokenAddress : "", safeAddress);
  const tokenAmountExceedsBalance = (() => {
    if (mode !== "erc20" || token.status !== "ready" || !value.trim()) return false;
    try {
      return parseUnits(value.trim(), token.decimals) > token.balance;
    } catch {
      return false;
    }
  })();

  const encoded = useMemo(
    () => (mode === "contract" && !showDataHex && selectedFn ? encodeCalldata(selectedFn, inputValues) : null),
    [mode, showDataHex, selectedFn, inputValues],
  );
  const allInputsFilled = !!selectedFn && selectedFn.inputs.every((_, i) => (inputValues[i] ?? "").trim() !== "");

  function handleSelectMethod(signature: string) {
    setSelectedMethod(signature);
    setInputValues([]);
  }

  function handleInputChange(index: number, value: string) {
    setInputValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  // Get queued transactions for nonce calculation
  const queuedTransactions = getAllTransactions(safeAddress as `0x${string}`, chainId);
  const nextAvailableNonce = React.useMemo(() => {
    if (!safeInfo) return 0;

    // Find highest nonce in queue
    const queuedNonces = queuedTransactions.map((tx: EthSafeTransaction) => Number(tx.data.nonce));
    const highestQueued = queuedNonces.length > 0 ? Math.max(...queuedNonces) : safeInfo.nonce - 1;

    // Next available is highest queued + 1, or current Safe nonce if nothing queued
    return Math.max(highestQueued + 1, safeInfo.nonce);
  }, [safeInfo, queuedTransactions]);

  // Set default nonce to next available
  React.useEffect(() => {
    if (nextAvailableNonce !== undefined) {
      setCustomNonce(String(nextAvailableNonce));
    }
  }, [nextAvailableNonce]);

  // Validate nonce whenever it changes
  React.useEffect(() => {
    if (!customNonce || !safeInfo) {
      setNonceWarning(null);
      return;
    }

    const nonce = parseInt(customNonce, 10);
    if (isNaN(nonce)) {
      setNonceWarning(null);
      return;
    }

    // Check if nonce is already used on-chain
    if (nonce < safeInfo.nonce) {
      setNonceWarning(
        `⚠️ This nonce (${nonce}) has already been executed on-chain. Current on-chain nonce is ${safeInfo.nonce}.`,
      );
      return;
    }

    // Check if nonce is already in queue
    const nonceInQueue = queuedTransactions.some((tx: EthSafeTransaction) => Number(tx.data.nonce) === nonce);
    if (nonceInQueue) {
      setNonceWarning(`⚠️ A transaction with nonce ${nonce} is already queued. Building this will overwrite it.`);
      return;
    }

    setNonceWarning(null);
  }, [customNonce, safeInfo, queuedTransactions]);

  /**
   * Build Safe transaction from the transactions list
   *
   * @returns Build and redirect to Safe transaction details page
   */
  async function handleBuildSafeTransaction() {
    setError(null);
    try {
      // Map transactions to ProtocolKit's SafeTransactionData format
      const txs = transactions.map((tx) => ({
        to: tx.to,
        value: tx.value,
        data: tx.data,
        operation: tx.operation ?? 0,
      }));

      // Parse custom nonce if provided
      const nonce = customNonce ? parseInt(customNonce, 10) : undefined;
      if (customNonce && (isNaN(nonce!) || nonce! < 0)) {
        setError("Invalid nonce value");
        return;
      }

      // Build transaction using ProtocolKit
      const safeTx = await buildSafeTransaction(txs, nonce);
      if (!safeTx) {
        setError("Invalid transaction");
        return;
      }
      const hash = await getSafeTransactionHash(safeTx);

      // Clear the draft from localStorage
      localStorage.removeItem(storageKey);

      // Redirect to tx details page
      navigate(`/safe/${safeAddress}/tx/${hash}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Handle building a single transaction entry and adding it to the list
   *
   * @param e Event
   */
  function handleBuildTx(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate recipient address
    const toAddr = to.trim();
    if (!toAddr || !toAddr.startsWith("0x") || toAddr.length !== 42) {
      setError("Invalid recipient address format. Must be 42 characters starting with 0x.");
      return;
    }

    if (!isValidAddress(toAddr)) {
      setError("Invalid recipient address. Must contain only hexadecimal characters.");
      return;
    }

    if (mode === "erc20") {
      if (token.status !== "ready") {
        setError("Select a token.");
        return;
      }
      if (toAddr.toLowerCase() === tokenAddress.trim().toLowerCase()) {
        setError("Recipient is the token contract itself — tokens sent there are usually lost.");
        return;
      }
      let amount: bigint;
      try {
        amount = parseUnits(value.trim(), token.decimals);
      } catch {
        setError(`Invalid amount. Use a number like 10 or 0.5 (max ${token.decimals} decimals).`);
        return;
      }
      if (amount <= 0n) {
        setError("Amount must be greater than 0.");
        return;
      }

      setTransactions((txs) => [
        ...txs,
        {
          to: tokenAddress.trim(),
          value: "0",
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddr as `0x${string}`, amount],
          }),
          method: `Transfer ${value.trim()} ${token.symbol} → ${toAddr.slice(0, 6)}…${toAddr.slice(-4)}`,
        },
      ]);
      setTo("");
      setValue("");
      return;
    }

    // Validate and normalize value (entered in native token, converted to wei)
    const valueStr = showValue ? value.trim() : "";
    if (valueStr && (isNaN(Number(valueStr)) || Number(valueStr) < 0)) {
      setError("Value must be a non-negative number.");
      return;
    }
    // Default to "0" if empty to prevent empty string in EIP-712 signing
    let normalizedValue: string;
    try {
      normalizedValue = parseEther(valueStr || "0").toString();
    } catch {
      setError(`Invalid value. Use a number like 1 or 0.5 (in ${chain?.nativeCurrency?.symbol ?? "native token"}).`);
      return;
    }

    let txData = "0x";
    let methodLabel = "Transfer";
    if (mode === "contract" && showDataHex) {
      txData = data.trim() || "0x";
      if (!/^0x([a-fA-F0-9]{2})*$/.test(txData)) {
        setError("Data must be 0x-prefixed hexadecimal with an even number of digits.");
        return;
      }
      methodLabel = txData.length >= 10 ? `Custom hex (${txData.slice(0, 10)})` : "Custom hex";
    } else if (mode === "contract") {
      if (!selectedFn || !encoded) {
        setError("Select a contract function.");
        return;
      }
      if (!encoded.success) {
        setError(encoded.error);
        return;
      }
      txData = encoded.data;
      methodLabel = selectedFn.name;
    }

    setTransactions((txs) => [
      ...txs,
      {
        to: toAddr,
        value: normalizedValue,
        data: txData,
        method: methodLabel,
      },
    ]);

    // Contract mode keeps the address and ABI so several calls to one contract can be batched quickly.
    setValue("");
    setData("");
    setInputValues([]);
    if (mode === "transfer") setTo("");
  }

  /**
   * Remove transaction from the list by index
   *
   * @param idx Index to remove
   */
  function handleRemoveTransaction(idx: number) {
    setTransactions((txs) => txs.filter((_, i) => i !== idx));
  }

  return (
    <AppSection className="mx-auto max-w-6xl">
      <div className="mb-4">
        <BtnCancel to={`/safe/${safeAddress}`} label="Back to Safe" data-testid="new-safe-tx-cancel-btn" />
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Transaction Builder (left) */}
        <div className="w-full md:w-1/2">
          <AppCard title={MODE_TITLES[mode]} data-testid="new-safe-tx-builder-card">
            <form
              onSubmit={handleBuildTx}
              className="flex flex-col gap-4"
              autoComplete="off"
              data-testid="new-safe-tx-builder-form"
            >
              {mode === "erc20" && (
                <Erc20TokenPicker
                  options={tokenOptions}
                  loading={tokenOptionsLoading}
                  selected={tokenSelection}
                  customAddress={customTokenAddress}
                  token={token}
                  onSelect={setTokenSelection}
                  onCustomAddressChange={setCustomTokenAddress}
                />
              )}
              <fieldset className="fieldset" data-testid="new-safe-tx-recipient-fieldset">
                <legend className="fieldset-legend">
                  {mode === "contract" ? "Contract address" : mode === "erc20" ? "Recipient" : "To"}
                </legend>
                <input
                  className="input input-bordered w-full font-mono text-sm"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="0x..."
                  autoComplete="off"
                  spellCheck={false}
                  pattern="^0x[a-fA-F0-9]{40}$"
                  required
                  data-testid="new-safe-tx-recipient-input"
                />
                {mode === "contract" && (
                  <ContractAbiStatus
                    state={abiState}
                    explorerUrl={explorerUrl}
                    address={to.trim()}
                    functionCount={fetchedAbi ? getWriteFunctions(fetchedAbi).length : 0}
                  />
                )}
              </fieldset>
              {mode === "contract" && (
                <>
                  {fetchedAbi && !showDataHex && (
                    <label className="label cursor-pointer justify-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={showManualAbi}
                        onChange={(e) => setShowManualAbi(e.target.checked)}
                        data-testid="new-safe-tx-abi-manual-toggle"
                      />
                      Use custom ABI
                    </label>
                  )}
                  {manualAbiVisible && !showDataHex && (
                    <fieldset className="fieldset" data-testid="new-safe-tx-abi-fieldset">
                      <legend className="fieldset-legend">ABI</legend>
                      <textarea
                        className={`textarea textarea-bordered w-full font-mono text-xs ${abiJson.trim() && !manualAbi ? "textarea-error" : ""}`}
                        rows={4}
                        value={abiJson}
                        onChange={(e) => setAbiJson(e.target.value)}
                        placeholder="Paste contract ABI JSON here"
                        spellCheck={false}
                        data-testid="new-safe-tx-abi-input"
                      />
                      {abiJson.trim() && !manualAbi && <span className="text-error text-xs">Invalid ABI JSON</span>}
                    </fieldset>
                  )}
                  {!showDataHex && writeFunctions.length > 0 && (
                    <fieldset className="fieldset" data-testid="new-safe-tx-abi-methods-fieldset">
                      <legend className="fieldset-legend">Function</legend>
                      <select
                        className="select select-bordered w-full font-mono text-sm"
                        value={selectedFn ? selectedMethod : ""}
                        onChange={(e) => handleSelectMethod(e.target.value)}
                        data-testid="new-safe-tx-abi-methods-select"
                      >
                        <option value="" disabled>
                          Select function…
                        </option>
                        {writeFunctions.map(({ fn, signature }) => (
                          <option key={signature} value={signature}>
                            {signature}
                            {fn.stateMutability === "payable" ? "  · payable" : ""}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  )}
                  {!showDataHex && activeAbi && writeFunctions.length === 0 && (
                    <p className="text-warning text-sm">This ABI has no state-changing functions.</p>
                  )}
                  {!showDataHex && selectedFn && (
                    <AbiFunctionInputs fn={selectedFn} values={inputValues} onChange={handleInputChange} />
                  )}
                  {encoded?.success && (
                    <div className="bg-base-300 rounded-box p-3" data-testid="new-safe-tx-calldata-preview">
                      <div className="mb-1 text-xs opacity-70">Calldata</div>
                      <DataPreview value={encoded.data} />
                    </div>
                  )}
                  {encoded && !encoded.success && allInputsFilled && (
                    <p className="text-error text-xs" data-testid="new-safe-tx-calldata-error">
                      {encoded.error}
                    </p>
                  )}
                  <label className="label cursor-pointer justify-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={showDataHex}
                      onChange={(e) => setShowDataHex(e.target.checked)}
                      data-testid="new-safe-tx-data-toggle"
                    />
                    Enter raw calldata (hex)
                  </label>
                  {showDataHex && (
                    <textarea
                      className="textarea textarea-bordered w-full font-mono text-xs"
                      rows={3}
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      placeholder="0x..."
                      spellCheck={false}
                      data-testid="new-safe-tx-data-input"
                    />
                  )}
                </>
              )}
              {mode === "erc20" && (
                <fieldset className="fieldset" data-testid="new-safe-tx-erc20-amount-fieldset">
                  <legend className="fieldset-legend">
                    Amount{token.status === "ready" ? ` (${token.symbol})` : ""}
                  </legend>
                  <input
                    className={`input input-bordered w-full ${tokenAmountExceedsBalance ? "input-warning" : ""}`}
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/,/g, "."))}
                    placeholder="0.0"
                    autoComplete="off"
                    inputMode="decimal"
                    data-testid="new-safe-tx-erc20-amount-input"
                  />
                  <Erc20Balance
                    token={token}
                    onMax={() => token.status === "ready" && setValue(formatUnits(token.balance, token.decimals))}
                  />
                  {tokenAmountExceedsBalance && (
                    <span className="text-warning text-xs">
                      Amount exceeds the current Safe balance — execution will fail unless the Safe is topped up.
                    </span>
                  )}
                </fieldset>
              )}
              {showValue && (
                <fieldset className="fieldset" data-testid="new-safe-tx-value-fieldset">
                  <legend className="fieldset-legend">
                    Value ({chain?.nativeCurrency?.symbol ?? "native"})
                    {mode === "contract" && isPayable ? " · payable" : ""}
                  </legend>
                  <input
                    className="input input-bordered w-full"
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/,/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === ",") e.preventDefault();
                    }}
                    placeholder="0.0"
                    autoComplete="off"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    data-testid="new-safe-tx-value-input"
                  />
                </fieldset>
              )}
              {/*  Error Alert */}
              {error && (
                <div className="alert alert-error text-sm whitespace-pre-wrap" data-testid="new-safe-tx-error-alert">
                  {error}
                </div>
              )}
              {/* Nonce Input */}
              <fieldset className="fieldset" data-testid="new-safe-tx-nonce-fieldset">
                <legend className="fieldset-legend">
                  Transaction Nonce{" "}
                  <span
                    className="tooltip tooltip-right"
                    data-tip={`Auto-selected ${nextAvailableNonce}. You can change it manually if needed.`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="inline-block h-4 w-4 stroke-current"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                </legend>
                {nonceWarning && (
                  <div className="alert alert-warning mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 shrink-0 stroke-current"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="text-sm">{nonceWarning}</div>
                  </div>
                )}
                <input
                  type="number"
                  className={`input input-bordered w-full ${nonceWarning ? "input-warning" : ""}`}
                  placeholder={`Next available: ${nextAvailableNonce}`}
                  value={customNonce}
                  onChange={(e) => setCustomNonce(e.target.value)}
                  min="0"
                  data-testid="new-safe-tx-nonce-input"
                />
                <label className="label">
                  <span className="label-text-alt">
                    On-chain nonce: {safeInfo?.nonce ?? "-"} | Queued transactions: {queuedTransactions.length}
                  </span>
                </label>
              </fieldset>
              {/* Submit Button */}
              <button type="submit" className="btn btn-primary" data-testid="new-safe-tx-add-btn">
                Add Transaction
              </button>
            </form>
          </AppCard>
        </div>
        {/* Transactions List & Build (right) */}
        <div className="w-full md:w-1/2">
          <AppCard title="Transactions List" data-testid="new-safe-tx-list-card">
            {transactions.length > 1 && (
              <div className="alert alert-info mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 shrink-0 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div className="text-sm">
                  <p className="font-semibold">MultiSend Batching</p>
                  <p>These {transactions.length} transactions will be batched together using MultiSend</p>
                </div>
              </div>
            )}
            <div className="overflow-x-auto" data-testid="new-safe-tx-list-table-row">
              <table className="table" data-testid="new-safe-tx-list-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Recipient</th>
                    <th>Method</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr data-testid="new-safe-tx-list-empty-row">
                      <td colSpan={4} className="text-center text-sm text-gray-400">
                        No transactions added
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <tr key={idx} data-testid={`new-safe-tx-list-row-${idx}`}>
                        <td>{idx + 1}</td>
                        <td className="font-mono text-xs break-all" data-testid={`new-safe-tx-list-recipient-${idx}`}>
                          {tx.to.length === 42 ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : tx.to}
                        </td>
                        <td data-testid={`new-safe-tx-list-method-${idx}`}>{tx.method}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleRemoveTransaction(idx)}
                            type="button"
                            aria-label="Remove transaction"
                            data-testid={`new-safe-tx-list-remove-btn-${idx}`}
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Build Safe Transaction Button */}
            <button
              className="btn btn-primary mt-4"
              type="button"
              onClick={handleBuildSafeTransaction}
              disabled={transactions.length === 0 || !isOwner}
              title={!isOwner ? "Only Safe owners can build transactions" : undefined}
              data-testid="new-safe-tx-build-btn"
            >
              Build/Batch Safe Transaction
            </button>
          </AppCard>
        </div>
      </div>
    </AppSection>
  );
}
