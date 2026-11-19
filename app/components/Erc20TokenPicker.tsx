import { formatUnits } from "viem";
import { Erc20TokenState } from "@/app/hooks/useErc20";
import { Erc20Option } from "@/app/utils/explorerTokens";

export const CUSTOM_TOKEN = "custom";

function formatBalance(balance: bigint | undefined, decimals: number | undefined): string | null {
  if (balance === undefined || decimals === undefined) return null;
  return Number(formatUnits(balance, decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function Erc20TokenPicker({
  options,
  loading,
  selected,
  customAddress,
  token,
  onSelect,
  onCustomAddressChange,
}: {
  options: Erc20Option[];
  loading: boolean;
  selected: string;
  customAddress: string;
  token: Erc20TokenState;
  onSelect: (value: string) => void;
  onCustomAddressChange: (value: string) => void;
}) {
  return (
    <fieldset className="fieldset" data-testid="new-safe-tx-erc20-token-fieldset">
      <legend className="fieldset-legend">Token</legend>
      <select
        className="select select-bordered w-full"
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        data-testid="new-safe-tx-erc20-token-select"
      >
        <option value="" disabled>
          {loading ? "Loading tokens…" : options.length ? "Select token…" : "No tokens found — enter address"}
        </option>
        {options.map((option) => {
          const balance = formatBalance(option.balance, option.decimals);
          return (
            <option key={option.address} value={option.address}>
              {option.symbol}
              {option.name && option.name !== option.symbol ? ` — ${option.name}` : ""}
              {balance !== null ? `  (${balance})` : ""}
            </option>
          );
        })}
        <option value={CUSTOM_TOKEN}>Other token (enter address)…</option>
      </select>
      {selected === CUSTOM_TOKEN && (
        <input
          className="input input-bordered mt-2 w-full font-mono text-sm"
          value={customAddress}
          onChange={(e) => onCustomAddressChange(e.target.value)}
          placeholder="Token contract address 0x..."
          autoComplete="off"
          spellCheck={false}
          data-testid="new-safe-tx-erc20-token-address-input"
        />
      )}
      {token.status === "loading" && (
        <div className="flex items-center gap-2 text-sm opacity-70">
          <span className="loading loading-spinner loading-xs" />
          Reading token…
        </div>
      )}
      {token.status === "error" && <div className="text-error text-sm">{token.error}</div>}
    </fieldset>
  );
}

export function Erc20Balance({ token, onMax }: { token: Erc20TokenState; onMax: () => void }) {
  if (token.status !== "ready") return null;
  return (
    <div className="flex items-center gap-2 text-xs opacity-80" data-testid="new-safe-tx-erc20-balance">
      Safe balance: {formatBalance(token.balance, token.decimals)} {token.symbol}
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        onClick={onMax}
        disabled={token.balance === 0n}
        data-testid="new-safe-tx-erc20-max-btn"
      >
        Max
      </button>
    </div>
  );
}
