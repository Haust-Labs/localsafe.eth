import { AbiFunction, AbiParameter, encodeFunctionData, isAddress } from "viem";

export type EncodeCalldataResult = { success: true; data: `0x${string}` } | { success: false; error: string };

const ARRAY_SUFFIX = /\[(\d*)\]$/;

function paramLabel(param: AbiParameter, index: number): string {
  return `${param.name || `#${index + 1}`} (${param.type})`;
}

function coerceValue(param: AbiParameter, raw: unknown): unknown {
  const arrayMatch = param.type.match(ARRAY_SUFFIX);
  if (arrayMatch) {
    const items = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(items)) throw new Error(`expected a JSON array`);
    if (arrayMatch[1] && items.length !== Number(arrayMatch[1])) {
      throw new Error(`expected ${arrayMatch[1]} items, got ${items.length}`);
    }
    const itemParam = { ...param, type: param.type.replace(ARRAY_SUFFIX, "") } as AbiParameter;
    return items.map((item) => coerceValue(itemParam, item));
  }

  if (param.type === "tuple") {
    const components = "components" in param ? param.components : [];
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(value)) return value.map((item, i) => coerceValue(components[i], item));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        components.map((c, i) => [
          c.name ?? String(i),
          coerceValue(c, (value as Record<string, unknown>)[c.name ?? i]),
        ]),
      );
    }
    throw new Error(`expected a JSON array or object`);
  }

  const str = typeof raw === "string" ? raw.trim() : raw;

  if (param.type.startsWith("uint") || param.type.startsWith("int")) {
    if (typeof str === "bigint") return str;
    if (str === "" || str === undefined || str === null) throw new Error("value is required");
    try {
      return BigInt(str as string | number);
    } catch {
      throw new Error("expected an integer (in base units, no decimals)");
    }
  }

  if (param.type === "bool") {
    if (typeof str === "boolean") return str;
    if (str === "true" || str === "1") return true;
    if (str === "false" || str === "0") return false;
    throw new Error(`expected true or false`);
  }

  if (param.type === "address") {
    if (typeof str !== "string" || !isAddress(str, { strict: false })) throw new Error("invalid address");
    return str;
  }

  if (param.type.startsWith("bytes")) {
    if (typeof str !== "string" || !/^0x([0-9a-fA-F]{2})*$/.test(str)) throw new Error("expected 0x-prefixed hex");
    return str;
  }

  return str;
}

/**
 * Encodes calldata for an ABI function from raw form values (one string per input, in ABI order).
 * Arrays and tuples are entered as JSON, e.g. `["0x…", "0x…"]` or `[1, "0x…"]`.
 */
export function encodeCalldata(fn: AbiFunction, rawValues: string[]): EncodeCalldataResult {
  const args: unknown[] = [];
  for (const [i, input] of fn.inputs.entries()) {
    const raw = rawValues[i] ?? "";
    if (raw.trim() === "" && input.type !== "string") {
      return { success: false, error: `Missing value for ${paramLabel(input, i)}` };
    }
    try {
      args.push(coerceValue(input, raw));
    } catch (err) {
      const reason = err instanceof SyntaxError ? "invalid JSON" : err instanceof Error ? err.message : String(err);
      return { success: false, error: `Invalid ${paramLabel(input, i)}: ${reason}` };
    }
  }

  try {
    return { success: true, data: encodeFunctionData({ abi: [fn], functionName: fn.name, args }) };
  } catch (err) {
    const message = err instanceof Error ? (err as { shortMessage?: string }).shortMessage || err.message : String(err);
    return { success: false, error: message };
  }
}
