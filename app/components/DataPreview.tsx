import { useState } from "react";

/**
 * Component to display a preview of a hexadecimal data string.
 * If the string exceeds a certain length, it shows a truncated version with an option to expand.
 *
 * @param {string} value - The hexadecimal data string to display.
 * @returns A component that displays the data string with preview and expand/collapse functionality.
 */
export default function DataPreview({ value }: { value: string }) {
  const [showAll, setShowAll] = useState(false);
  const METHOD_SELECTOR_LEN = 10; // 4 bytes + 0x prefix
  const PREVIEW_LEN = 80;
  if (!value) return <span className="text-gray-400">-</span>;
  // Show full value
  if (showAll || value.length <= PREVIEW_LEN) {
    return (
      <div className="max-w-full overflow-hidden">
        <p className="overflow-wrap-anywhere font-mono text-xs break-all">
          <b aria-label="The first 4 bytes determine the contract method that is being called">
            {value.slice(0, METHOD_SELECTOR_LEN)}
          </b>
          {value.slice(METHOD_SELECTOR_LEN)}
        </p>
        {value.length > PREVIEW_LEN && (
          <button className="btn btn-xs btn-link" type="button" onClick={() => setShowAll(false)}>
            Hide
          </button>
        )}
      </div>
    );
  }
  // Truncated preview
  return (
    <div className="max-w-full overflow-hidden">
      <p className="overflow-wrap-anywhere font-mono text-xs break-all">
        <b aria-label="The first 4 bytes determine the contract method that is being called">
          {value.slice(0, METHOD_SELECTOR_LEN)}
        </b>
        {value.slice(METHOD_SELECTOR_LEN, PREVIEW_LEN)}
        <span className="text-gray-400">…</span>
      </p>
      <button className="btn btn-xs btn-link" type="button" onClick={() => setShowAll(true)}>
        Show more
      </button>
    </div>
  );
}
