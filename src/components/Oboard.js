// src/components/Onboard.jsx
import React, { useEffect, useState } from "react";
import Button from "./Button";

export default function Onboard({ open, current, onClose, onDone }) {
  const [name, setName] = useState(current?.name || "");
  const [image, setImage] = useState(current?.image_url || "");

  useEffect(() => {
    setName(current?.name || "");
    setImage(current?.image_url || "");
  }, [current, open]);

  const valid =
    name.trim().length > 0 &&
    /^https?:\/\/.+/i.test((image || "").trim());

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-[92%] max-w-sm p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Quick setup</h3>
          <button onClick={onClose} className="text-xl leading-none">×</button>
        </div>

        <label className="block text-sm mb-1">Name</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-3"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-sm mb-1">Image URL (required)</label>
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="https://…"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            className="px-4 py-2 rounded-lg border"
            onClick={onClose}
          >
            Cancel
          </button>
          <Button
            type="primary"
            onClick={() => onDone?.({ name: name.trim(), image_url: image.trim() })}
            disabled={!valid}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
