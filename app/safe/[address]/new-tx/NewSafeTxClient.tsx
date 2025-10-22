"use client";

import AppSection from "@/app/components/AppSection";
import { isValidAddress } from "@/app/utils/helpers";
import AppCard from "@/app/components/AppCard";
import { useState } from "react";
import React from "react";
import useSafe from "@/app/hooks/useSafe";
import { useParams, useRouter } from "next/navigation";
import BtnCancel from "@/app/components/BtnCancel";
import { AbiFunctionItem } from "@/app/utils/types";

/**
 * Helper to extract function names from ABI
 *
 * @param abi ABI array
 * @returns
 */
function getAbiMethods(abi: AbiFunctionItem[]): string[] {
  return abi
    .filter((item) => item.type === "function")
    .map((item) => item.name);
}

/**
 * Helper to get inputs of a specific method from ABI
 *
 * @param abi ABI array
 * @param methodName Method name
 * @returns Input definitions
 */
function getAbiMethodInputs(
  abi: AbiFunctionItem[],
  methodName: string,
): { name: string; type: string }[] {
  const method = abi.find(
    (item) => item.type === "function" && item.name === methodName,
  );
  return method?.inputs ?? [];
}

/**
 * Handler for ABI method selection
 */
function handleAbiMethodSelect(
  abiJson: string,
  methodName: string,
  setSelectedMethod: (name: string) => void,
  setMethodInputs: (inputs: { name: string; type: string }[]) => void,
  setInputValues: (vals: Record<string, string>) => void,
) {
  setSelectedMethod(methodName);
  try {
    const abi = JSON.parse(abiJson);
    setMethodInputs(getAbiMethodInputs(abi, methodName));
    setInputValues({});
  } catch {
    setMethodInputs([]);
  }
}

/**
 * Helper to parse ABI JSON and extract method names
 *
 * @param json ABI JSON string
 * @returns Method names array
 */
function parseAbiMethodsFromJson(json: string): string[] {
  try {
    const abi = JSON.parse(json);
    return getAbiMethods(abi);
  } catch {
    return [];
  }
}

/**
 * Component for creating a new Safe transaction
 *
 * @returns Component for creating a new Safe transaction
 */
export default function NewSafeTxClient() {
  // Hooks
  const { address: safeAddress } = useParams();
  const router = useRouter();
  const { buildSafeTransaction, getSafeTransactionHash, isOwner, safeInfo } = useSafe(
    safeAddress as `0x${string}`,
  );

  // Form state
  const [to, setTo] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDataHex, setShowDataHex] = useState(false);
  const [abiJson, setAbiJson] = useState("");
  const [abiMethods, setAbiMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [methodInputs, setMethodInputs] = useState<
    { name: string; type: string }[]
  >([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [customNonce, setCustomNonce] = useState<string>("");
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
      // Redirect to tx details page
      router.push(`/safe/${safeAddress}/tx/${hash}`);
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

    // Validate and normalize value
    const valueStr = value.trim();
    if (valueStr && (isNaN(Number(valueStr)) || Number(valueStr) < 0)) {
      setError("Value must be a non-negative number.");
      return;
    }
    // Default to "0" if empty to prevent empty string in EIP-712 signing
    const normalizedValue = valueStr || "0";

    // Validate data hex if provided
    const dataHex = data.trim();
    if (dataHex && !dataHex.startsWith("0x")) {
      setError("Data must start with 0x.");
      return;
    }
    if (dataHex && dataHex.length > 2 && !/^0x[a-fA-F0-9]*$/.test(dataHex)) {
      setError("Data must be valid hexadecimal.");
      return;
    }

    // Determine method label
    let methodLabel = "Transfer";
    if (dataHex && dataHex !== "0x") {
      methodLabel = "Custom hex";
    } else if (abiJson && abiMethods.length > 0 && selectedMethod) {
      methodLabel = selectedMethod;
    }

    // Add transaction to the list
    setTransactions((txs) => [
      ...txs,
      {
        to: toAddr,
        value: normalizedValue,
        data: dataHex || "0x",
        method: methodLabel,
      },
    ]);

    // Reset form fields
    setTo("");
    setValue("");
    setData("");
    setSelectedMethod("");
    setMethodInputs([]);
    setInputValues({});
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
    <AppSection className="mx-auto max-w-4xl">
      <div className="mb-4">
        <BtnCancel
          href={`/safe/${safeAddress}`}
          label="Back to Safe"
          data-testid="new-safe-tx-cancel-btn"
        />
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Transaction Builder (left) */}
        <div className="w-full md:w-1/2">
          <AppCard
            title="Build Transaction"
            data-testid="new-safe-tx-builder-card"
          >
            {/* Quick Action Buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setValue("0");
                  setData("0x");
                  setShowDataHex(false);
                  setAbiJson("");
                  setAbiMethods([]);
                  setSelectedMethod("");
                }}
                data-testid="quick-action-native-currency"
              >
                Move Native Currency
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setValue("0");
                  setShowDataHex(true);
                  // ERC20 transfer function signature: transfer(address,uint256)
                  const transferSelector = "0xa9059cbb";
                  setData(transferSelector);
                  setAbiJson("");
                  setAbiMethods([]);
                  setSelectedMethod("");
                }}
                data-testid="quick-action-tokens"
              >
                Move Tokens (ERC20)
              </button>
            </div>
            <form
              onSubmit={handleBuildTx}
              className="flex flex-col gap-4"
              autoComplete="off"
              data-testid="new-safe-tx-builder-form"
            >
              <fieldset
                className="fieldset"
                data-testid="new-safe-tx-recipient-fieldset"
              >
                <legend className="fieldset-legend">Recipient</legend>
                <input
                  className="input input-bordered w-full"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="0x..."
                  autoComplete="off"
                  pattern="^0x[a-fA-F0-9]{40}$"
                  required
                  data-testid="new-safe-tx-recipient-input"
                />
              </fieldset>
              <fieldset
                className="fieldset"
                data-testid="new-safe-tx-value-fieldset"
              >
                <legend className="fieldset-legend">Value (wei)</legend>
                <input
                  className="input input-bordered w-full"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  autoComplete="off"
                  type="number"
                  min="0"
                  step="any"
                  data-testid="new-safe-tx-value-input"
                />
              </fieldset>
              {/* ABI Input and Method Selector */}
              <fieldset
                className="fieldset"
                data-testid="new-safe-tx-abi-fieldset"
              >
                <legend className="fieldset-legend">ABI (optional)</legend>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={abiJson}
                  onChange={(e) => {
                    setAbiJson(e.target.value);
                    setAbiMethods(parseAbiMethodsFromJson(e.target.value));
                  }}
                  placeholder="Paste contract ABI JSON here"
                  autoComplete="off"
                  data-testid="new-safe-tx-abi-input"
                />
                {abiMethods.length > 0 && (
                  <div
                    className="mt-2"
                    data-testid="new-safe-tx-abi-methods-select-row"
                  >
                    <label className="label">Select Method:</label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedMethod}
                      onChange={(e) =>
                        handleAbiMethodSelect(
                          abiJson,
                          e.target.value,
                          setSelectedMethod,
                          setMethodInputs,
                          setInputValues,
                        )
                      }
                      data-testid="new-safe-tx-abi-methods-select"
                    >
                      <option value="">-- Select --</option>
                      {abiMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {methodInputs.length > 0 && (
                  <div
                    className="mt-2 flex flex-col gap-2"
                    data-testid="new-safe-tx-abi-method-inputs-row"
                  >
                    {methodInputs.map((input) => (
                      <input
                        key={input.name}
                        className="input input-bordered w-full"
                        placeholder={`${input.name} (${input.type})`}
                        value={inputValues[input.name] ?? ""}
                        onChange={(e) =>
                          setInputValues((vals) => ({
                            ...vals,
                            [input.name]: e.target.value,
                          }))
                        }
                        autoComplete="off"
                        data-testid={`new-safe-tx-abi-method-input-${input.name}`}
                      />
                    ))}
                  </div>
                )}
              </fieldset>
              {/* Data Hex Input */}
              <fieldset
                className="fieldset"
                data-testid="new-safe-tx-data-fieldset"
              >
                <legend className="fieldset-legend">Data (hex)</legend>
                <label className="label cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDataHex}
                    onChange={() => setShowDataHex((v) => !v)}
                    className="toggle toggle-xs"
                    data-testid="new-safe-tx-data-toggle"
                  />
                  <span className="ml-2">Show Data Hex</span>
                </label>
                {showDataHex && (
                  <>
                    <textarea
                      className="textarea textarea-bordered mt-2 w-full"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      placeholder="0x..."
                      autoComplete="off"
                      data-testid="new-safe-tx-data-input"
                    />
                  </>
                )}
              </fieldset>
              {/*  Error Alert */}
              {error && (
                <div
                  className="alert alert-error text-sm whitespace-pre-wrap"
                  data-testid="new-safe-tx-error-alert"
                >
                  {error}
                </div>
              )}
              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary"
                data-testid="new-safe-tx-add-btn"
              >
                Add Transaction
              </button>
            </form>
          </AppCard>
        </div>
        {/* Transactions List & Build (right) */}
        <div className="w-full md:w-1/2">
          <AppCard
            title="Transactions List"
            data-testid="new-safe-tx-list-card"
          >
            <div
              className="overflow-x-auto"
              data-testid="new-safe-tx-list-table-row"
            >
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
                      <td
                        colSpan={4}
                        className="text-center text-sm text-gray-400"
                      >
                        No transactions added
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <tr key={idx} data-testid={`new-safe-tx-list-row-${idx}`}>
                        <td>{idx + 1}</td>
                        <td
                          className="font-mono text-xs break-all"
                          data-testid={`new-safe-tx-list-recipient-${idx}`}
                        >
                          {tx.to.length === 42
                            ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`
                            : tx.to}
                        </td>
                        <td data-testid={`new-safe-tx-list-method-${idx}`}>
                          {tx.method}
                        </td>
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
            {/* Nonce Input */}
            {transactions.length > 0 && (
              <div className="mt-4">
                <label className="label">
                  <span className="label-text text-sm">
                    Custom Nonce (optional, current: {safeInfo?.nonce ?? "-"})
                  </span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full"
                  placeholder={`Leave empty for current nonce (${safeInfo?.nonce ?? ""})`}
                  value={customNonce}
                  onChange={(e) => setCustomNonce(e.target.value)}
                  min="0"
                  data-testid="new-safe-tx-nonce-input"
                />
              </div>
            )}
            {/* Build Safe Transaction Button */}
            <button
              className="btn btn-primary mt-4"
              type="button"
              onClick={handleBuildSafeTransaction}
              disabled={transactions.length === 0 || !isOwner}
              title={
                !isOwner ? "Only Safe owners can build transactions" : undefined
              }
              data-testid="new-safe-tx-build-btn"
            >
              Build Safe Transaction
            </button>
          </AppCard>
        </div>
      </div>
    </AppSection>
  );
}
