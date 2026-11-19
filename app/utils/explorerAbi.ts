import { Abi, AbiFunction, toFunctionSignature } from "viem";

export type ContractAbiResult =
  | { kind: "eoa" }
  | { kind: "unverified"; name?: string }
  | { kind: "verified"; abi: Abi; name?: string; implementationName?: string };

type BlockscoutAddress = {
  is_contract?: boolean;
  is_verified?: boolean;
  name?: string | null;
  implementations?: { address_hash?: string; address?: string; name?: string | null }[];
};

type BlockscoutSmartContract = {
  abi?: Abi | null;
  name?: string | null;
};

const cache = new Map<string, Promise<ContractAbiResult>>();

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Explorer request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function getContractAbi(apiBase: string, address: string): Promise<BlockscoutSmartContract | null> {
  const contract = await getJson<BlockscoutSmartContract>(`${apiBase}/smart-contracts/${address}`);
  return contract?.abi?.length ? contract : null;
}

function mergeAbis(primary: Abi, secondary: Abi): Abi {
  const signatures = new Set(
    primary.filter((item): item is AbiFunction => item.type === "function").map((fn) => toFunctionSignature(fn)),
  );
  const extra = secondary.filter(
    (item) => item.type === "function" && !signatures.has(toFunctionSignature(item as AbiFunction)),
  );
  return [...primary, ...extra];
}

async function loadContractAbi(explorerUrl: string, address: string): Promise<ContractAbiResult> {
  const apiBase = `${explorerUrl.replace(/\/+$/, "")}/api/v2`;

  const info = await getJson<BlockscoutAddress>(`${apiBase}/addresses/${address}`);
  if (!info?.is_contract) return { kind: "eoa" };

  const implementation = info.implementations?.[0];
  const implementationAddress = implementation?.address_hash ?? implementation?.address;
  const [own, impl] = await Promise.all([
    info.is_verified ? getContractAbi(apiBase, address) : null,
    implementationAddress ? getContractAbi(apiBase, implementationAddress) : null,
  ]);

  // Proxy: implementation functions first, proxy's own admin functions appended.
  if (impl?.abi) {
    return {
      kind: "verified",
      abi: own?.abi ? mergeAbis(impl.abi, own.abi) : impl.abi,
      name: own?.name ?? info.name ?? undefined,
      implementationName: impl.name ?? implementation?.name ?? undefined,
    };
  }
  if (own?.abi) return { kind: "verified", abi: own.abi, name: own.name ?? info.name ?? undefined };
  return { kind: "unverified", name: info.name ?? undefined };
}

/**
 * Resolves a contract ABI from a Blockscout explorer, following proxies to their implementation.
 */
export function fetchContractAbi(explorerUrl: string, address: string): Promise<ContractAbiResult> {
  const key = `${explorerUrl}:${address.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = loadContractAbi(explorerUrl, address);
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

export function getWriteFunctions(abi: Abi): AbiFunction[] {
  return abi.filter(
    (item): item is AbiFunction =>
      item.type === "function" &&
      item.stateMutability !== "view" &&
      item.stateMutability !== "pure" &&
      !(item as { constant?: boolean }).constant,
  );
}

export function parseAbiJson(json: string): Abi | null {
  try {
    const parsed = JSON.parse(json);
    const abi = Array.isArray(parsed) ? parsed : parsed?.abi;
    return Array.isArray(abi) ? (abi as Abi) : null;
  } catch {
    return null;
  }
}
