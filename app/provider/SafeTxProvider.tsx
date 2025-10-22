"use client";

import {
  EthSafeSignature,
  EthSafeTransaction,
} from "@safe-global/protocol-kit";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { SAFE_TX_STORAGE_KEY } from "../utils/constants";

export interface SafeTxContextType {
  saveTransaction: (safeAddress: string, txObj: EthSafeTransaction) => void;
  getTransaction: (safeAddress: string) => EthSafeTransaction | null;
  getAllTransactions: (safeAddress: string) => EthSafeTransaction[];
  removeTransaction: (safeAddress: string, txHash?: string) => void;
  exportTx: (safeAddress: string) => string;
  importTx: (safeAddress: string, json: string) => void;
}

const SafeTxContext = createContext<SafeTxContextType | undefined>(undefined);

export const SafeTxProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // In-memory map of current transactions per safeAddress (now stores arrays)
  const currentTxMapRef = useRef<{
    [safeAddress: string]: EthSafeTransaction[];
  }>({});

  // Hydrate all transactions from localStorage on mount
  type StoredTx = {
    data: EthSafeTransaction["data"];
    signatures?: EthSafeSignature[];
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawMap = localStorage.getItem(SAFE_TX_STORAGE_KEY);
      if (rawMap) {
        const parsedMap: Record<string, StoredTx[]> = JSON.parse(rawMap);
        Object.entries(parsedMap).forEach(([safeAddress, txArray]) => {
          const transactions: EthSafeTransaction[] = [];
          if (Array.isArray(txArray)) {
            txArray.forEach((parsed) => {
              if (parsed && typeof parsed === "object" && "data" in parsed) {
                const txObj = new EthSafeTransaction(parsed.data);
                if (parsed.signatures && Array.isArray(parsed.signatures)) {
                  parsed.signatures.forEach(
                    (sig: {
                      signer: string;
                      data: string;
                      isContractSignature: boolean;
                    }) => {
                      const ethSignature = new EthSafeSignature(
                        sig.signer,
                        sig.data,
                        sig.isContractSignature,
                      );
                      txObj.addSignature(ethSignature);
                    },
                  );
                }
                transactions.push(txObj);
              }
            });
          }
          currentTxMapRef.current[safeAddress] = transactions;
        });
      }
    } catch {
      // Ignore hydration errors
    }
  }, []);

  // Add or update a transaction for a specific safeAddress
  function saveTransaction(safeAddress: string, txObj: EthSafeTransaction) {
    const txToSave = {
      data: txObj.data,
      signatures: txObj.signatures ? Array.from(txObj.signatures.values()) : [],
    };

    // Get existing transactions or initialize empty array
    const existingTxs = currentTxMapRef.current[safeAddress] || [];

    // Check if transaction with same nonce already exists
    const existingIndex = existingTxs.findIndex(
      (tx) => tx.data.nonce === txObj.data.nonce
    );

    if (existingIndex >= 0) {
      // Update existing transaction
      existingTxs[existingIndex] = txObj;
    } else {
      // Add new transaction
      existingTxs.push(txObj);
    }

    // Sort by nonce
    existingTxs.sort((a, b) => Number(a.data.nonce) - Number(b.data.nonce));

    currentTxMapRef.current[safeAddress] = existingTxs;

    if (typeof window !== "undefined") {
      // Get full map, update, and save
      let map: Record<string, StoredTx[]> = {};
      const rawMap = localStorage.getItem(SAFE_TX_STORAGE_KEY);
      if (rawMap) {
        map = JSON.parse(rawMap);
      }
      map[safeAddress] = existingTxs.map((tx) => ({
        data: tx.data,
        signatures: tx.signatures ? Array.from(tx.signatures.values()) : [],
      }));
      localStorage.setItem(SAFE_TX_STORAGE_KEY, JSON.stringify(map));
    }
  }

  // Get the first transaction (lowest nonce) for a specific safeAddress
  function getTransaction(safeAddress: string): EthSafeTransaction | null {
    const txs = currentTxMapRef.current[safeAddress];
    return (txs && txs.length > 0) ? txs[0] : null;
  }

  // Get all transactions for a specific safeAddress, sorted by nonce
  function getAllTransactions(safeAddress: string): EthSafeTransaction[] {
    return currentTxMapRef.current[safeAddress] || [];
  }

  // Remove a transaction for a specific safeAddress
  // If txHash is provided, remove only that transaction. Otherwise, remove all.
  function removeTransaction(safeAddress: string, txHash?: string) {
    if (!txHash) {
      // Remove all transactions
      currentTxMapRef.current[safeAddress] = [];
      if (typeof window !== "undefined") {
        let map: Record<string, StoredTx[]> = {};
        const rawMap = localStorage.getItem(SAFE_TX_STORAGE_KEY);
        if (rawMap) {
          map = JSON.parse(rawMap);
        }
        delete map[safeAddress];
        localStorage.setItem(SAFE_TX_STORAGE_KEY, JSON.stringify(map));
      }
    } else {
      // Remove specific transaction by hash
      const existingTxs = currentTxMapRef.current[safeAddress] || [];
      const filtered = existingTxs.filter((tx) => {
        // Compare transaction hashes (you'd need a hash function here)
        // For now, compare by nonce as a simple approach
        return JSON.stringify(tx.data) !== JSON.stringify(txHash);
      });
      currentTxMapRef.current[safeAddress] = filtered;

      if (typeof window !== "undefined") {
        let map: Record<string, StoredTx[]> = {};
        const rawMap = localStorage.getItem(SAFE_TX_STORAGE_KEY);
        if (rawMap) {
          map = JSON.parse(rawMap);
        }
        if (filtered.length > 0) {
          map[safeAddress] = filtered.map((tx) => ({
            data: tx.data,
            signatures: tx.signatures ? Array.from(tx.signatures.values()) : [],
          }));
        } else {
          delete map[safeAddress];
        }
        localStorage.setItem(SAFE_TX_STORAGE_KEY, JSON.stringify(map));
      }
    }
  }

  // Export all transactions for a specific safeAddress as JSON
  function exportTx(safeAddress: string): string {
    const txs = currentTxMapRef.current[safeAddress];
    if (!txs || txs.length === 0) return "";

    const txsData = txs.map((tx) => ({
      data: tx.data,
      signatures: tx.signatures
        ? Array.from(tx.signatures.values()).map((sig) => ({
            signer: sig.signer,
            data: sig.data,
            isContractSignature: sig.isContractSignature,
          }))
        : [],
    }));

    return JSON.stringify({ transactions: txsData });
  }

  // Import transaction(s) for a specific safeAddress from JSON
  function importTx(safeAddress: string, json: string) {
    try {
      const obj = JSON.parse(json);
      const transactions: EthSafeTransaction[] = [];

      // Handle new format (array of transactions)
      if (obj.transactions && Array.isArray(obj.transactions)) {
        obj.transactions.forEach((storedTx: StoredTx) => {
          if (storedTx.data) {
            const txObj = new EthSafeTransaction(storedTx.data);
            if (storedTx.signatures && Array.isArray(storedTx.signatures)) {
              storedTx.signatures.forEach(
                (sig: {
                  signer: string;
                  data: string;
                  isContractSignature: boolean;
                }) => {
                  const ethSignature = new EthSafeSignature(
                    sig.signer,
                    sig.data,
                    sig.isContractSignature,
                  );
                  txObj.addSignature(ethSignature);
                },
              );
            }
            transactions.push(txObj);
          }
        });
      }
      // Handle old format (single transaction)
      else if (obj.tx && obj.tx.data) {
        const txObj = new EthSafeTransaction(obj.tx.data);
        if (obj.tx.signatures && Array.isArray(obj.tx.signatures)) {
          obj.tx.signatures.forEach(
            (sig: {
              signer: string;
              data: string;
              isContractSignature: boolean;
            }) => {
              const ethSignature = new EthSafeSignature(
                sig.signer,
                sig.data,
                sig.isContractSignature,
              );
              txObj.addSignature(ethSignature);
            },
          );
        }
        transactions.push(txObj);
      }

      if (transactions.length > 0) {
        // Sort by nonce
        transactions.sort((a, b) => Number(a.data.nonce) - Number(b.data.nonce));

        currentTxMapRef.current[safeAddress] = transactions;
        if (typeof window !== "undefined") {
          let map: Record<string, StoredTx[]> = {};
          const rawMap = localStorage.getItem(SAFE_TX_STORAGE_KEY);
          if (rawMap) {
            map = JSON.parse(rawMap);
          }
          map[safeAddress] = transactions.map((tx) => ({
            data: tx.data,
            signatures: tx.signatures ? Array.from(tx.signatures.values()) : [],
          }));
          localStorage.setItem(SAFE_TX_STORAGE_KEY, JSON.stringify(map));
        }
      }
    } catch {
      // Invalid import
    }
  }

  return (
    <SafeTxContext.Provider
      value={{
        saveTransaction,
        getTransaction,
        getAllTransactions,
        removeTransaction,
        exportTx,
        importTx,
      }}
    >
      {children}
    </SafeTxContext.Provider>
  );
};

export function useSafeTxContext() {
  const ctx = useContext(SafeTxContext);
  if (!ctx)
    throw new Error("useSafeTxContext must be used within a SafeTxProvider");
  return ctx;
}
