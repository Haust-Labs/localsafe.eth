export type Erc20Option = {
  address: `0x${string}`;
  symbol: string;
  name?: string;
  decimals?: number;
  balance?: bigint;
};

type BlockscoutTokenBalance = {
  value?: string;
  token?: {
    address_hash?: string;
    address?: string;
    symbol?: string | null;
    name?: string | null;
    decimals?: string | null;
    type?: string;
  };
};

/**
 * Lists ERC-20 tokens held by `address` according to a Blockscout explorer.
 */
export async function fetchErc20Balances(explorerUrl: string, address: string): Promise<Erc20Option[]> {
  const res = await fetch(`${explorerUrl.replace(/\/+$/, "")}/api/v2/addresses/${address}/token-balances`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Explorer request failed: ${res.status}`);

  const items = (await res.json()) as BlockscoutTokenBalance[];
  return items.flatMap((item) => {
    const tokenAddress = item.token?.address_hash ?? item.token?.address;
    if (item.token?.type !== "ERC-20" || !tokenAddress) return [];
    return [
      {
        address: tokenAddress as `0x${string}`,
        symbol: item.token.symbol || "???",
        name: item.token.name ?? undefined,
        decimals: item.token.decimals ? Number(item.token.decimals) : undefined,
        balance: item.value ? BigInt(item.value) : undefined,
      },
    ];
  });
}
