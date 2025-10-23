"use client";

import React, { useState, useEffect } from "react";
import Modal from "./Modal";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

const COINGECKO_API_KEY_STORAGE = "coingecko-api-key";

export default function ApiKeyModal({ open, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(COINGECKO_API_KEY_STORAGE);
      if (stored) {
        setApiKey(stored);
        setSaved(true);
      } else {
        setApiKey("");
        setSaved(false);
      }
    }
  }, [open]);

  function handleSave() {
    if (apiKey.trim()) {
      localStorage.setItem(COINGECKO_API_KEY_STORAGE, apiKey.trim());
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  }

  function handleClear() {
    localStorage.removeItem(COINGECKO_API_KEY_STORAGE);
    setApiKey("");
    setSaved(false);
  }

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false}>
      <h2 className="mb-4 text-2xl font-bold">CoinGecko API Settings</h2>

      <div className="mb-4">
        <p className="mb-2 text-sm">
          To display USD token prices, you need a CoinGecko API key.
        </p>
        <p className="mb-4 text-sm opacity-70">
          Get your free API key at:{" "}
          <a
            href="https://www.coingecko.com/en/api/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            coingecko.com/api
          </a>
        </p>
      </div>

      <div className="mb-4">
        <label className="label">
          <span className="label-text font-semibold">API Key</span>
        </label>
        <input
          type="password"
          className="input input-bordered w-full font-mono text-sm"
          placeholder="Enter your CoinGecko API key"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      {saved && (
        <div className="alert alert-success mb-4">
          API key saved successfully!
        </div>
      )}

      <div className="flex justify-between gap-2">
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleClear}
          disabled={!apiKey}
        >
          Clear
        </button>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!apiKey.trim() || saved}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function getCoinGeckoApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(COINGECKO_API_KEY_STORAGE);
}
