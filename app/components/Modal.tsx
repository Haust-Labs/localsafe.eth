import React from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  boxClassName?: string;
  showCloseButton?: boolean;
  closeLabel?: string;
  testid?: string;
  closeOnClickOutside?: boolean;
}

/**
 * A reusable modal component with customizable content and styling.
 *
 * @param {boolean} open - Whether the modal is open or not.
 * @param {() => void} onClose - Function to call when closing the modal.
 * @param {React.ReactNode} children - The content to be displayed inside the modal.
 * @param {string} [className] - Optional additional CSS classes for the modal container.
 * @param {string} [boxClassName] - Optional additional CSS classes for the modal box.
 * @param {boolean} [showCloseButton=true] - Whether to show a close button at the bottom of the modal.
 * @param {string} [closeLabel="Close"] - Label for the close button.
 * @param {string} [testid="modal"] - Optional test ID for testing purposes.
 * @param {boolean} [closeOnClickOutside=false] - Whether to close the modal when clicking outside of it.
 * @returns A styled modal component with customizable content and behavior.
 */
export default function Modal({
  open,
  onClose,
  children,
  className = "modal modal-bottom sm:modal-middle",
  boxClassName = "modal-box flex flex-col gap-6 p-8",
  showCloseButton = true,
  closeLabel = "Close",
  testid = "modal",
  closeOnClickOutside = false,
}: ModalProps) {
  if (!open) return null;
  return (
    <dialog className={className} open data-testid={testid}>
      <div className={boxClassName}>
        {children}
        {showCloseButton && (
          <div className="mt-6 flex justify-center">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {closeLabel}
            </button>
          </div>
        )}
      </div>
      {closeOnClickOutside && (
        <form method="dialog" className="modal-backdrop">
          <button type="reset" onClick={onClose}>
            close
          </button>
        </form>
      )}
    </dialog>
  );
}
