/**
 * CoinGecko API utilities for fetching token prices
 */

const PRICE_CACHE_KEY = "coingecko-price-cache";
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface PriceCache {
  [key: string]: {
    price: number;
    timestamp: number;
  };
}

interface CoinGeckoResponse {
  market_data?: {
    current_price?: {
      usd?: number;
    };
  };
}

// Map chain IDs to CoinGecko platform IDs
const CHAIN_ID_TO_PLATFORM: { [chainId: number]: string } = {
  1: "ethereum",
  10: "optimistic-ethereum",
  56: "binance-smart-chain",
  100: "xdai",
  137: "polygon-pos",
  250: "fantom",
  324: "zksync",
  8453: "base",
  42161: "arbitrum-one",
  43114: "avalanche",
  59144: "linea",
  534352: "scroll",
  1101: "polygon-zkevm",
  7777777: "zora",
  1313161554: "aurora",
  5000: "mantle",
  42220: "celo",
  11155111: "ethereum", // Sepolia uses same platform as mainnet
  84532: "base", // Base Sepolia
};

const HAUST_CHAIN_ID = 3864;

// Haust isn't indexed by CoinGecko as an asset platform, so contract-address lookup
// won't work. Instead, map known Haust ERC20 contracts to the CoinGecko coin slug of
// their canonical (Ethereum) counterpart and fetch USD price via /simple/price?ids=...
// Keys must be lowercase.
const HAUST_TOKEN_SLUGS: { [address: string]: string } = {
  "0xa8ce8aee21bc2a48a5ef670afcc9274c7bbbc035": "usd-coin", // USDC
  "0x5a77f1443d16ee5761d310e38b62f77f726bc71c": "ethereum", // ETH
  "0x1e4a5963abfd975d8c9021ce480b42188849d41d": "tether", // USDT
  "0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1": "bitcoin", // BTC
};

// Native coin slug per chain — used to price a chain's native gas token when it is
// not represented by an ERC20 contract.
const NATIVE_TOKEN_SLUGS: { [chainId: number]: string } = {
  [HAUST_CHAIN_ID]: "haust",
};

interface SimplePriceResponse {
  [slug: string]: { usd?: number };
}

async function fetchPriceBySlug(slug: string, apiKey: string): Promise<number | null> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(slug)}&vs_currencies=usd`;
  const response = await fetch(url, {
    headers: {
      "x-cg-demo-api-key": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.warn(`CoinGecko API error: ${response.status} for slug ${slug}`);
    return null;
  }

  const data: SimplePriceResponse = await response.json();
  const price = data?.[slug]?.usd;
  return typeof price === "number" ? price : null;
}

/**
 * Get cached price or null if expired
 */
function getCachedPrice(cacheKey: string): number | null {
  if (typeof window === "undefined") return null;

  try {
    const cacheStr = localStorage.getItem(PRICE_CACHE_KEY);
    if (!cacheStr) return null;

    const cache: PriceCache = JSON.parse(cacheStr);
    const entry = cache[cacheKey];

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CACHE_DURATION_MS) {
      return null; // Expired
    }

    return entry.price;
  } catch {
    return null;
  }
}

/**
 * Set cached price
 */
function setCachedPrice(cacheKey: string, price: number): void {
  if (typeof window === "undefined") return;

  try {
    const cacheStr = localStorage.getItem(PRICE_CACHE_KEY);
    const cache: PriceCache = cacheStr ? JSON.parse(cacheStr) : {};

    cache[cacheKey] = {
      price,
      timestamp: Date.now(),
    };

    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to cache price:", error);
  }
}

/**
 * Fetch token price from CoinGecko API by contract address
 *
 * @param contractAddress - Token contract address
 * @param chainId - Chain ID
 * @param apiKey - CoinGecko API key
 * @returns USD price or null if not found
 */
export async function fetchTokenPrice(
  contractAddress: string,
  chainId: number,
  apiKey: string,
): Promise<number | null> {
  // Check cache first
  const cacheKey = `${chainId}-${contractAddress.toLowerCase()}`;
  const cachedPrice = getCachedPrice(cacheKey);

  if (cachedPrice !== null) {
    return cachedPrice;
  }

  // Haust mainnet: CoinGecko doesn't index this chain's contracts, so resolve
  // via the canonical token's slug (e.g. USDC -> "usd-coin") and /simple/price.
  if (chainId === HAUST_CHAIN_ID) {
    const slug = HAUST_TOKEN_SLUGS[contractAddress.toLowerCase()];
    if (!slug) {
      console.warn(`No CoinGecko slug mapping for Haust token: ${contractAddress}`);
      return null;
    }
    try {
      const price = await fetchPriceBySlug(slug, apiKey);
      if (price !== null) {
        setCachedPrice(cacheKey, price);
      }
      return price;
    } catch (error) {
      console.error("Failed to fetch token price by slug:", error);
      return null;
    }
  }

  // Map chainId to CoinGecko platform
  const platform = CHAIN_ID_TO_PLATFORM[chainId];
  if (!platform) {
    console.warn(`Unsupported chain ID for CoinGecko: ${chainId}`);
    return null;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${contractAddress.toLowerCase()}`;

    const response = await fetch(url, {
      headers: {
        "x-cg-demo-api-key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`CoinGecko API error: ${response.status} for ${contractAddress}`);
      return null;
    }

    const data: CoinGeckoResponse = await response.json();
    const price = data.market_data?.current_price?.usd;

    if (typeof price === "number") {
      // Cache the price
      setCachedPrice(cacheKey, price);
      return price;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch token price from CoinGecko:", error);
    return null;
  }
}

/**
 * Fetch native gas-token USD price by chain ID (uses CoinGecko slug lookup).
 * Returns null if there is no slug mapping for this chain or if the API call fails.
 */
export async function fetchNativeTokenPrice(chainId: number, apiKey: string): Promise<number | null> {
  const slug = NATIVE_TOKEN_SLUGS[chainId];
  if (!slug) {
    return null;
  }

  const cacheKey = `${chainId}-native`;
  const cachedPrice = getCachedPrice(cacheKey);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  try {
    const price = await fetchPriceBySlug(slug, apiKey);
    if (price !== null) {
      setCachedPrice(cacheKey, price);
    }
    return price;
  } catch (error) {
    console.error("Failed to fetch native token price:", error);
    return null;
  }
}

/**
 * Clear all cached prices
 */
export function clearPriceCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PRICE_CACHE_KEY);
}

/**
 * Clear expired cache entries
 */
export function cleanExpiredCache(): void {
  if (typeof window === "undefined") return;

  try {
    const cacheStr = localStorage.getItem(PRICE_CACHE_KEY);
    if (!cacheStr) return;

    const cache: PriceCache = JSON.parse(cacheStr);
    const now = Date.now();
    const cleaned: PriceCache = {};

    for (const [key, entry] of Object.entries(cache)) {
      if (now - entry.timestamp <= CACHE_DURATION_MS) {
        cleaned[key] = entry;
      }
    }

    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cleaned));
  } catch (error) {
    console.error("Failed to clean cache:", error);
  }
}
