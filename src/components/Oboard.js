import React, { useState } from "react";

export default function Onboard({ open, current, onClose, onDone }) {
  const [name, setName] = useState(current?.name || "");
  const [image_url, setImageUrl] = useState(current?.image_url || "");

  if (!open) return null;

  const submit = () => {
    onDone?.({ name: name || "Anonymous", image_url: image_url || "" });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[360px] space-y-4">
        <h3 className="text-lg font-semibold">Who’s donating?</h3>
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Profile image URL (optional)"
          value={image_url}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <div className="flex gap-3">
          <button className="flex-1 py-2 rounded border" onClick={onClose}>
            Cancel
          </button>
          <button className="flex-1 py-2 rounded bg-black text-white" onClick={submit}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
