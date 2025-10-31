import React from "react";

interface AppSectionProps {
  children: React.ReactNode;
  className?: string;
  testid?: string;
}

/**
 * A reusable section component to wrap content with consistent styling.
 * @param {React.ReactNode} children - The content to be displayed inside the section.
 * @param {string} [className] - Optional additional CSS classes for styling.
 * @param {string} [testid] - Optional test ID for testing purposes.
 * @returns A styled section component.
 */
export default function AppSection({ children, className, testid }: AppSectionProps) {
  return (
    <section
      className={"container mx-auto flex flex-col gap-8 p-10" + (className ? " " + className : "")}
      data-testid={testid || "app-section"}
    >
      {children}
    </section>
  );
}
