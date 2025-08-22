// src/components/Onboard.js
import React, { useEffect, useState } from "react";

export default function Onboard({ open, current, onClose, onDone }) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    setName(current?.name || "");
    setImageUrl(current?.image_url || "");
  }, [current]);

  if (!open) return null;

  const save = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please add a name.");
      return;
    }
    onDone?.({ name: name.trim(), image_url: imageUrl.trim() || null });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick setup</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm hover:bg-black/5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={save} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">Name</span>
            <input
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">Image URL (optional)</span>
            <input
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
