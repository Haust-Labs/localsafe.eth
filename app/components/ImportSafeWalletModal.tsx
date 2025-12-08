import React from "react";
import Modal from "./Modal";
import { SafeWalletData } from "../utils/types";

export interface ImportSafeWalletModalProps {
  open: boolean;
  onClose: () => void;
  importPreview: SafeWalletData | { error: string } | null;
  setSafeWalletData: (data: SafeWalletData) => void;
}

/**
 * Generate a summary string for the imported SafeWallet data.
 *
 * @param {SafeWalletData | { error: string } | null} data - The imported SafeWallet data or an error object.
 * @returns A summary string of the SafeWallet data or an error message.
 */
function getSafeWalletSummary(data: SafeWalletData | { error: string } | null): string {
  if (!data || typeof data !== "object" || "error" in data) return "No valid SafeWallet data.";
  let summary = "";
  try {
    // Address Book
    const addressBook = data.data?.addressBook ?? {};
    const chainContacts: string[] = [];
    Object.entries(addressBook).forEach(([chain, contactsObj]) => {
      const count = Object.keys(contactsObj).length;
      chainContacts.push(`${chain}: ${count} contact${count !== 1 ? "s" : ""}`);
    });
    summary += `Address book for ${Object.keys(addressBook).length} chains\n`;
    summary += chainContacts.join("\n") + "\n";
    // Visited Safe Accounts history
    summary += `Visited Safe Accounts history\n`;
    // Not activated Safe Accounts
    const undeployedSafes = data.data?.undeployedSafes ?? {};
    let undeployedCount = 0;
    Object.values(undeployedSafes).forEach((safesObj) => {
      undeployedCount += Object.keys(safesObj).length;
    });
    summary += `Not activated Safe Accounts ${undeployedCount}`;
  } catch {
    summary = "Could not summarize SafeWallet data.";
  }
  return summary;
}

/**
 * A modal component to import a SafeWallet data from a JSON object.
 *
 * @param {boolean} open - Whether the modal is open or not.
 * @param {() => void} onClose - Function to call when closing the modal.
 * @param {SafeWalletData | { error: string } | null} importPreview - The imported SafeWallet data or an error object.
 * @param {(data: SafeWalletData) => void} setSafeWalletData - Function to set the SafeWallet data.
 * @returns A modal component for importing SafeWallet data.
 */
export default function ImportSafeWalletModal({
  open,
  onClose,
  importPreview,
  setSafeWalletData,
}: ImportSafeWalletModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      boxClassName="modal-box w-full max-w-2xl flex flex-col gap-6 p-8"
      showCloseButton={false}
      testid="import-modal"
    >
      <h3 className="mb-4 text-lg font-bold">Import SafeWallet Data</h3>
      <>
        <div className="alert alert-warning mb-4 text-sm">
          <span>
            <strong>Warning:</strong> This will replace all your current SafeWallet data. This action cannot be undone.
          </span>
        </div>
        <div className="bg-base-200 mb-4 w-full rounded border p-4 shadow">
          <pre className="max-h-[40vh] overflow-y-auto font-mono text-xs break-words whitespace-pre-wrap">
            {getSafeWalletSummary(importPreview)}
          </pre>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-error"
            disabled={typeof importPreview !== "object" || importPreview === null || "error" in importPreview}
            onClick={() => {
              if (importPreview && typeof importPreview === "object" && !("error" in importPreview)) {
                setSafeWalletData(importPreview as SafeWalletData);
                onClose();
              }
            }}
            data-testid="replace-wallets-btn"
          >
            Replace
          </button>
        </div>
      </>
    </Modal>
  );
}
