"use client";

import { recoverAddress } from "viem";

// Caches whether a given wallet address is detected as an AA / smart-account
// wallet — i.e. the signature it produces does not recover to the address it
// claims via eth_accounts. Used to hide the off-chain "Sign Transaction"
// affordance and route the user to the on-chain `approveHash` flow instead.

const STORAGE_KEY = "localsafe-aa-wallet-cache-v1";

type AACache = Record<string, boolean>;

function readCache(): AACache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as AACache;
  } catch {
    return {};
  }
}

function writeCache(cache: AACache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    window.dispatchEvent(new CustomEvent("localsafe-aa-cache-updated"));
  } catch {
    // ignore quota / privacy errors
  }
}

export function isAAWallet(address: string | undefined | null): boolean {
  if (!address) return false;
  return readCache()[address.toLowerCase()] === true;
}

export function markWalletAA(address: string, isAA: boolean): void {
  const cache = readCache();
  cache[address.toLowerCase()] = isAA;
  writeCache(cache);
}

/**
 * Recover the address that actually produced an EIP-712 signature and compare
 * to the address the wallet claims to be. Mismatch → AA wallet (or a buggy
 * EIP-695 implementation, etc.) — marks the wallet in the cache.
 *
 * Pass the EIP-712 hash that `kit.getTransactionHash(safeTx)` returns and the
 * raw 65-byte signature data from the wallet. Adjusts `v` from 31/32 (eth_sign
 * variant) back to 27/28 before recovering.
 */
export async function detectAAFromSignature(
  claimedAddress: string,
  eip712Hash: `0x${string}`,
  signatureData: string,
): Promise<{ recovered: `0x${string}`; isAA: boolean }> {
  let sig = signatureData.startsWith("0x") ? signatureData : `0x${signatureData}`;
  const vByte = parseInt(sig.slice(-2), 16);
  // Safe SDK appends 4 to v for eth_sign-style sigs; viem's recoverAddress
  // expects 27/28 with the original (non-prefixed) hash. We assume here that
  // the hash passed in is the typed-data hash (no eth-message prefix).
  if (vByte === 31 || vByte === 32) {
    const adjustedV = (vByte - 4).toString(16).padStart(2, "0");
    sig = sig.slice(0, -2) + adjustedV;
  }
  const recovered = await recoverAddress({ hash: eip712Hash, signature: sig as `0x${string}` });
  const isAA = recovered.toLowerCase() !== claimedAddress.toLowerCase();
  markWalletAA(claimedAddress, isAA);
  return { recovered, isAA };
}
