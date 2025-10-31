import React from "react";
import AppCard from "@/app/components/AppCard";

interface StepLayoutProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * A layout component for steps in a multi-step process.
 *
 * @param {React.ReactNode} title - The title of the step.
 * @param {React.ReactNode} description - A brief description of the step.
 * @param {React.ReactNode} actions - Action buttons or links related to the step.
 * @param {React.ReactNode} children - The main content of the step.
 * @param {string} [className] - Optional additional CSS classes for styling.
 * @returns A styled layout component for multi-step processes.
 */
export default function StepLayout({ title, description, actions, children, className }: StepLayoutProps) {
  return (
    <AppCard title={title} className={"col-span-12 md:col-span-7 " + (className ?? "")}>
      {description && <p className="text-base-content mb-4">{description}</p>}
      <div className="flex flex-1 flex-col gap-4">{children}</div>
      {actions && <div className="mt-auto flex justify-between gap-4">{actions}</div>}
    </AppCard>
  );
}
