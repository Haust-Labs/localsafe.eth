import React from "react";

interface AppAddressProps {
  address: string;
  className?: string;
  testid?: string;
}

/**
 * Component to display a blockchain address.
 *
 * @param {string} address - The blockchain address to display.
 * @param {string} [className] - Optional additional CSS classes for styling.
 * @param {string} [testid] - Optional test ID for testing purposes.
 * @returns A styled span element containing the blockchain address.
 */
export default function AppAddress({ address, className, testid }: AppAddressProps) {
  return (
    <span
      className={
        "bg-base-200 border-base-300 rounded border px-2 py-1 font-mono text-base break-all" +
        (className ? " " + className : "")
      }
      data-testid={testid || "app-address"}
    >
      {address}
    </span>
  );
}
