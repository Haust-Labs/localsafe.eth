import React from "react";

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  testid?: string;
}

/**
 * A reusable card component with optional title and action buttons.
 * @param {React.ReactNode} children - The content to be displayed inside the card.
 * @param {string} [className] - Optional additional CSS classes for styling.
 * @param {React.ReactNode} [title] - Optional title to be displayed at the top of the card.
 * @param {React.ReactNode} [actions] - Optional action buttons to be displayed at the bottom of the card.
 * @param {string} [testid] - Optional test ID for testing purposes.
 * @returns A styled card component with optional title and actions.
 */
export default function AppCard({ children, className, title, actions, testid }: AppCardProps) {
  return (
    <div
      className={
        "bg-base-100 border-primary flex flex-col gap-4 rounded border-2 p-10 shadow-lg" +
        (className ? " " + className : "")
      }
      data-testid={testid || "app-card"}
    >
      {title && <h2 className="mb-4 text-xl font-bold">{title}</h2>}
      {children}
      {actions && <div className="mt-4 flex justify-end gap-2">{actions}</div>}
    </div>
  );
}
