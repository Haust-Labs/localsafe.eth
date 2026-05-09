"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import type { Chain } from "wagmi/chains";
import AppCard from "./AppCard";

const SUCCESS_EVENT = parseAbiItem("event ExecutionSuccess(bytes32 indexed txHash, uint256 payment)");
const FAILURE_EVENT = parseAbiItem("event ExecutionFailure(bytes32 indexed txHash, uint256 payment)");

const HISTORY_LIMIT = 50;
const PAGE_SIZE = 10;
// Most public RPCs cap eth_getLogs to a finite block range (Haust gateway: 1_000_000).
// Use 999_999 to stay strictly under the cap regardless of inclusive/exclusive interpretation.
const LOG_CHUNK_SIZE = 999_999n;
// Safety cap: don't walk further than this many blocks back if we still don't have 50 events.
const MAX_LOOKBACK_BLOCKS = 50_000_000n;

type HistoryItem = {
  status: "success" | "failure";
  safeTxHash: `0x${string}`;
  onchainTxHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
};

interface Props {
  safeAddress: `0x${string}`;
  chain?: Chain;
  refreshKey?: number;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function TransactionHistorySection({ safeAddress, chain, refreshKey }: Props) {
  const publicClient = usePublicClient();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // Tracks the last successfully-fetched (chainId, safeAddress) pair so the
  // first fetch shows a spinner but background polls update silently.
  const lastFetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicClient) return;

    let cancelled = false;
    const fetchKey = `${publicClient.chain?.id ?? ""}:${safeAddress}`;
    const isInitial = lastFetchKeyRef.current !== fetchKey;

    if (isInitial) setLoading(true);

    (async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const earliestAllowed = latestBlock > MAX_LOOKBACK_BLOCKS ? latestBlock - MAX_LOOKBACK_BLOCKS : 0n;

        const merged: HistoryItem[] = [];
        let toBlock = latestBlock;

        while (!cancelled && toBlock >= earliestAllowed && merged.length < HISTORY_LIMIT) {
          const fromBlock = toBlock > LOG_CHUNK_SIZE ? toBlock - LOG_CHUNK_SIZE : 0n;
          const lowerBound = fromBlock < earliestAllowed ? earliestAllowed : fromBlock;

          const [successLogs, failureLogs] = await Promise.all([
            publicClient.getLogs({
              address: safeAddress,
              event: SUCCESS_EVENT,
              fromBlock: lowerBound,
              toBlock,
            }),
            publicClient.getLogs({
              address: safeAddress,
              event: FAILURE_EVENT,
              fromBlock: lowerBound,
              toBlock,
            }),
          ]);

          for (const l of successLogs) {
            merged.push({
              status: "success",
              safeTxHash: l.args.txHash as `0x${string}`,
              onchainTxHash: (l.transactionHash ?? "0x") as `0x${string}`,
              blockNumber: l.blockNumber ?? 0n,
              logIndex: Number(l.logIndex ?? 0),
            });
          }
          for (const l of failureLogs) {
            merged.push({
              status: "failure",
              safeTxHash: l.args.txHash as `0x${string}`,
              onchainTxHash: (l.transactionHash ?? "0x") as `0x${string}`,
              blockNumber: l.blockNumber ?? 0n,
              logIndex: Number(l.logIndex ?? 0),
            });
          }

          if (lowerBound === 0n) break;
          toBlock = lowerBound - 1n;
        }

        merged.sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) return Number(b.blockNumber - a.blockNumber);
          return b.logIndex - a.logIndex;
        });

        if (!cancelled) {
          const limited = merged.slice(0, HISTORY_LIMIT);
          // Only swap state if the list actually differs — avoids re-render on idle polls.
          setItems((prev) => {
            if (prev.length !== limited.length) return limited;
            for (let i = 0; i < limited.length; i++) {
              if (
                prev[i].onchainTxHash !== limited[i].onchainTxHash ||
                prev[i].logIndex !== limited[i].logIndex ||
                prev[i].status !== limited[i].status
              ) {
                return limited;
              }
            }
            return prev;
          });
          if (isInitial) setPage(0);
          setError(null);
          lastFetchKeyRef.current = fetchKey;
        }
      } catch (e) {
        if (cancelled) return;
        if (isInitial) {
          setError(e instanceof Error ? e.message : String(e));
          setItems([]);
        } else {
          // Silent failure on background polling — keep last good data on screen.
          console.warn("Tx history refresh failed, keeping previous data:", e);
        }
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, safeAddress, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paged = useMemo(() => items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [items, page]);

  const explorerUrl = chain?.blockExplorers?.default?.url;

  return (
    <AppCard title="Transaction History" testid="safe-dashboard-tx-history-card">
      {loading && (
        <div className="flex h-20 items-center justify-center" data-testid="safe-dashboard-tx-history-loading">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}
      {error && !loading && (
        <div className="alert alert-error text-sm" data-testid="safe-dashboard-tx-history-error">
          Failed to load history: {error}
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="text-sm text-gray-400" data-testid="safe-dashboard-tx-history-empty">
          No executed transactions on-chain yet.
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="table-sm table" data-testid="safe-dashboard-tx-history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Safe Tx Hash</th>
                  <th>On-chain Tx</th>
                  <th>Block</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item, idx) => (
                  <tr
                    key={`${item.onchainTxHash}-${item.logIndex}`}
                    data-testid={`safe-dashboard-tx-history-row-${page * PAGE_SIZE + idx}`}
                  >
                    <td>{page * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <span className={`badge ${item.status === "success" ? "badge-success" : "badge-error"}`}>
                        {item.status === "success" ? "Success" : "Failure"}
                      </span>
                    </td>
                    <td className="font-mono text-xs" title={item.safeTxHash}>
                      {shortHash(item.safeTxHash)}
                    </td>
                    <td className="font-mono text-xs">
                      {explorerUrl ? (
                        <a
                          href={`${explorerUrl}/tx/${item.onchainTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="link link-primary"
                          title={item.onchainTxHash}
                        >
                          {shortHash(item.onchainTxHash)}
                        </a>
                      ) : (
                        <span title={item.onchainTxHash}>{shortHash(item.onchainTxHash)}</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">{String(item.blockNumber)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="mt-2 flex items-center justify-between" data-testid="safe-dashboard-tx-history-pagination">
              <button
                className="btn btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                data-testid="safe-dashboard-tx-history-prev-btn"
              >
                Prev
              </button>
              <span className="text-xs">
                Page {page + 1} of {pageCount} · {items.length} total
              </span>
              <button
                className="btn btn-sm"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                data-testid="safe-dashboard-tx-history-next-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </AppCard>
  );
}
