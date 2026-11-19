import React from "react";
import AppAddress from "@/app/components/AppAddress";

export type BroadcastStatus = "pending" | "success" | "execution-failed" | "reverted" | "timeout";

export interface BroadcastModalProps {
  open: boolean;
  txHash?: string | null;
  error?: string | null;
  status?: BroadcastStatus;
  blockNumber?: bigint | null;
  blockExplorerUrl?: string;
  onClose: () => void;
  closeLabel?: string;
  onSuccess?: () => void;
  successLabel?: string;
  testid?: string;
}

const STATUS_VIEW: Record<BroadcastStatus, { title: string; tone: string; text: string }> = {
  pending: {
    title: "Waiting for confirmation",
    tone: "text-info",
    text: "The transaction was sent. Waiting for it to be included in a block…",
  },
  success: { title: "Transaction confirmed", tone: "text-success", text: "The Safe executed the transaction." },
  "execution-failed": {
    title: "Executed with failure",
    tone: "text-warning",
    text: "The transaction was mined and the nonce was used, but the inner call failed (ExecutionFailure). No changes were applied.",
  },
  reverted: {
    title: "Transaction reverted",
    tone: "text-error",
    text: "The transaction reverted on-chain. The nonce was not used — you can try again.",
  },
  timeout: {
    title: "Still pending",
    tone: "text-warning",
    text: "No confirmation yet. Check the status on the explorer.",
  },
};

function StatusIcon({ status }: { status: BroadcastStatus }) {
  if (status === "pending") return <span className="loading loading-spinner loading-lg text-primary" />;
  const path =
    status === "success"
      ? "M5 13l4 4L19 7"
      : status === "reverted"
        ? "M6 18L18 6M6 6l12 12"
        : "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z";
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full bg-current/15 ${STATUS_VIEW[status].tone}`}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </div>
  );
}

/**
 * Shows the lifecycle of a broadcast Safe transaction: sending → waiting for receipt → result.
 */
const BroadcastModal: React.FC<BroadcastModalProps> = ({
  open,
  txHash,
  error,
  status = "pending",
  blockNumber,
  blockExplorerUrl,
  onClose,
  closeLabel = "Close",
  onSuccess,
  successLabel = "Back to Safe",
  testid = "broadcast-modal",
}) => {
  if (!open) return null;
  const view = STATUS_VIEW[status];
  const settled = !!error || status !== "pending";

  return (
    <dialog id="broadcast_modal" className="modal modal-bottom sm:modal-middle" open data-testid={testid}>
      <div className="modal-box flex !max-w-xl flex-col items-center gap-4 p-8 text-center">
        {error ? (
          <>
            <StatusIcon status="reverted" />
            <div className="text-lg font-bold">Broadcast failed</div>
          </>
        ) : (
          <>
            <StatusIcon status={status} />
            <div className="text-lg font-bold" data-testid="broadcast-modal-status">
              {view.title}
            </div>
            <p className="text-sm opacity-80">
              {view.text}
              {status === "success" && blockNumber != null ? ` Block ${blockNumber.toString()}.` : ""}
            </p>
          </>
        )}

        {txHash && (
          <div className="flex max-w-full flex-col items-center gap-1" data-testid="broadcast-modal-txhash-row">
            <span className="text-xs opacity-60">Transaction hash</span>
            {blockExplorerUrl ? (
              <a
                href={`${blockExplorerUrl}/tx/${encodeURIComponent(txHash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary max-w-full"
                data-testid="broadcast-modal-txhash-link"
              >
                <AppAddress address={txHash} className="text-xs" />
              </a>
            ) : (
              <AppAddress address={txHash} className="text-xs" testid="broadcast-modal-txhash" />
            )}
          </div>
        )}

        {error && (
          <div
            className="alert alert-error w-full max-w-full overflow-x-auto text-left break-words"
            data-testid="broadcast-modal-error-row"
          >
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <div className="mt-2 flex justify-center gap-4" data-testid="broadcast-modal-actions">
          {!settled ? null : onSuccess && successLabel && !error && status !== "reverted" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onSuccess()}
              data-testid="broadcast-modal-success-btn"
            >
              {successLabel}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              data-testid="broadcast-modal-close-btn"
            >
              {closeLabel}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
};

export { BroadcastModal };
