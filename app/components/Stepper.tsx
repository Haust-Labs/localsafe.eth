import React from "react";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

/**
 * A stepper component to visualize progress through a series of steps.
 *
 * @param {string[]} steps - An array of step labels.
 * @param {number} currentStep - The index of the current active step (0-based).
 * @returns A styled stepper component.
 */
const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => (
  <ul className="steps col-span-4">
    {steps.map((label, idx) => (
      <li key={label} className={"text-base-content step text-sm" + (idx <= currentStep ? " step-primary" : "")}>
        {label}
      </li>
    ))}
  </ul>
);

export default Stepper;
