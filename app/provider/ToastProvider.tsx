"use client";

import { createContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import ToastContainer from "../components/ToastContainer";
import { ToastType } from "../components/Toast";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

export type AlertOptions = {
  title?: string;
  type?: ToastType;
  confirmLabel?: string;
};

interface ConfirmContextType {
  confirm: (message: string, title?: string) => Promise<boolean>;
  alert: (message: string, options?: AlertOptions) => Promise<void>;
}

type DialogState = {
  kind: "confirm" | "alert";
  message: string;
  title: string;
  type: ToastType;
  confirmLabel: string;
  resolve: (value: boolean) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
export const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

const DEFAULT_ALERT_TITLES: Record<ToastType, string> = {
  success: "Done",
  error: "Something went wrong",
  warning: "Heads up",
  info: "Notice",
};

const ICON_STYLES: Record<ToastType, string> = {
  success: "bg-success/15 text-success",
  error: "bg-error/15 text-error",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

const ICON_PATHS: Record<ToastType, string> = {
  success: "M5 13l4 4L19 7",
  error: "M6 18L18 6M6 6l12 12",
  warning: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  info: "M13 16h-1v-4h-1m1-4h.01",
};

function DialogIcon({ type }: { type: ToastType }) {
  return (
    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${ICON_STYLES[type]}`}>
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[type]} />
      </svg>
    </div>
  );
}

interface ToastProviderProps {
  children: ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => addToast("success", message, duration),
    [addToast],
  );

  const error = useCallback((message: string, duration?: number) => addToast("error", message, duration), [addToast]);

  const warning = useCallback(
    (message: string, duration?: number) => addToast("warning", message, duration),
    [addToast],
  );

  const info = useCallback((message: string, duration?: number) => addToast("info", message, duration), [addToast]);

  const confirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        kind: "confirm",
        message,
        title: title || "Confirm",
        type: "warning",
        confirmLabel: "Confirm",
        resolve,
      });
    });
  }, []);

  const alert = useCallback((message: string, options: AlertOptions = {}): Promise<void> => {
    const type = options.type ?? "info";
    return new Promise((resolve) => {
      setDialog({
        kind: "alert",
        message,
        title: options.title ?? DEFAULT_ALERT_TITLES[type],
        type,
        confirmLabel: options.confirmLabel ?? "OK",
        resolve: () => resolve(),
      });
    });
  }, []);

  const closeDialog = useCallback((value: boolean) => {
    setDialog((prev) => {
      if (prev) setTimeout(() => prev.resolve(value), 0);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [dialog, closeDialog]);

  const toastValue = useMemo(() => ({ success, error, warning, info }), [success, error, warning, info]);
  const confirmValue = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <ToastContext.Provider value={toastValue}>
      <ConfirmContext.Provider value={confirmValue}>
        {children}
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {dialog && (
          // Rendered after app content and above other .modal layers, so it can stack on top of an open modal.
          <div className="modal modal-open z-[1000]">
            <div
              className="modal-box max-w-md text-center"
              role={dialog.kind === "alert" ? "alertdialog" : "dialog"}
              aria-modal="true"
              aria-labelledby="app-dialog-title"
              aria-describedby="app-dialog-description"
            >
              <DialogIcon type={dialog.type} />
              <h3 id="app-dialog-title" className="mt-4 text-lg font-bold">
                {dialog.title}
              </h3>
              <p id="app-dialog-description" className="mt-2 text-sm break-words whitespace-pre-wrap opacity-80">
                {dialog.message}
              </p>
              <div className="mt-6 flex justify-center gap-2">
                {dialog.kind === "confirm" && (
                  <button className="btn btn-ghost" onClick={() => closeDialog(false)}>
                    Cancel
                  </button>
                )}
                <button
                  className={`btn ${dialog.kind === "alert" ? "btn-primary min-w-32" : "btn-primary"}`}
                  onClick={() => closeDialog(true)}
                  autoFocus
                  data-testid="app-dialog-confirm-btn"
                >
                  {dialog.confirmLabel}
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => closeDialog(false)} />
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
