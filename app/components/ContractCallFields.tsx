import { AbiFunction, AbiParameter } from "viem";
import { ContractAbiState } from "@/app/hooks/useContractAbi";

function placeholderFor(type: string): string {
  if (type.endsWith("]")) return '["…", "…"]';
  if (type === "tuple") return '["…", "…"]  or  {"field": "…"}';
  if (type === "address") return "0x…";
  if (type.startsWith("bytes")) return "0x…";
  if (type.startsWith("uint") || type.startsWith("int")) return "0";
  return "";
}

function formatType(param: AbiParameter): string {
  if (!param.type.startsWith("tuple")) return param.type;
  const components = "components" in param ? param.components : [];
  return param.type.replace("tuple", `(${components.map(formatType).join(", ")})`);
}

export function ContractAbiStatus({
  state,
  explorerUrl,
  address,
  functionCount,
}: {
  state: ContractAbiState;
  explorerUrl?: string;
  address: string;
  functionCount: number;
}) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70" data-testid="new-safe-tx-abi-status-loading">
        <span className="loading loading-spinner loading-xs" />
        Fetching ABI from explorer…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="text-error text-sm" data-testid="new-safe-tx-abi-status-error">
        Couldn&apos;t load ABI: {state.error}. Paste it manually below.
      </div>
    );
  }

  if (state.kind === "eoa") {
    return (
      <div className="text-warning text-sm" data-testid="new-safe-tx-abi-status-eoa">
        This address is not a contract.
      </div>
    );
  }

  if (state.kind === "unverified") {
    return (
      <div className="text-warning text-sm" data-testid="new-safe-tx-abi-status-unverified">
        Contract{state.name ? ` ${state.name}` : ""} is not verified on the explorer. Paste the ABI below or enter raw
        calldata.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 text-sm" data-testid="new-safe-tx-abi-status-verified">
      <span className="text-success">✓</span>
      <span className="font-semibold">{state.name ?? "Verified contract"}</span>
      {state.implementationName && <span className="opacity-70">→ proxy to {state.implementationName}</span>}
      <span className="opacity-70">· {functionCount} write functions</span>
      {explorerUrl && (
        <a
          className="link link-primary ml-auto text-xs"
          href={`${explorerUrl.replace(/\/+$/, "")}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on explorer
        </a>
      )}
    </div>
  );
}

export function AbiFunctionInputs({
  fn,
  values,
  onChange,
}: {
  fn: AbiFunction;
  values: string[];
  onChange: (index: number, value: string) => void;
}) {
  if (fn.inputs.length === 0) {
    return <p className="text-sm opacity-70">This function takes no arguments.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {fn.inputs.map((input, i) => {
        const key = input.name || String(i);
        const testId = `new-safe-tx-abi-method-input-${key}`;
        return (
          <fieldset className="fieldset py-0" key={`${fn.name}-${key}`}>
            <legend className="fieldset-legend">
              {input.name || `arg${i}`}
              <span className="badge badge-ghost badge-sm font-mono">{formatType(input)}</span>
            </legend>
            {input.type === "bool" ? (
              <select
                className="select select-bordered w-full"
                value={values[i] ?? ""}
                onChange={(e) => onChange(i, e.target.value)}
                data-testid={testId}
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                className="input input-bordered w-full font-mono text-sm"
                value={values[i] ?? ""}
                onChange={(e) => onChange(i, e.target.value)}
                placeholder={placeholderFor(input.type)}
                autoComplete="off"
                spellCheck={false}
                data-testid={testId}
              />
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
