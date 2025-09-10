// src/components/Onboard.js
import React, { useEffect, useRef, useState } from "react";
import { API_BASE } from "../config/Creator";

export default function Onboard({ open, current, onClose, onDone }) {
  const [name, setName] = useState("");
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName((current?.name || "").trim());
      setPreview(current?.image_url || "");
      setFile(null);
      setBusy(false);
    }
  }, [open, current]);

  if (!open) return null;

  const canSave = Boolean(name?.trim()) && Boolean(preview);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  async function signedUpload(f) {
    if (!f) return current?.image_url || null;

    const r = await fetch(`${API_BASE}/api/storage/avatar-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: f.name,
        contentType: f.type || "image/jpeg",
      }),
    });
    if (!r.ok) throw new Error("Could not get upload URL");
    const { uploadUrl, publicUrl, error } = await r.json();
    if (error || !uploadUrl || !publicUrl) throw new Error(error || "Bad upload URL");

    const put = await fetch(uploadUrl, {
      method: "PUT",
      body: f,
      headers: { "Content-Type": f.type || "application/octet-stream" },
    });
    if (!put.ok) throw new Error("Upload failed");
    return publicUrl;
  }

  const handleSave = async () => {
    try {
      if (!canSave) return;
      setBusy(true);
      const imageUrl = await signedUpload(file);
      if (!imageUrl) throw new Error("Please choose a photo.");
      onDone({ name: name.trim(), image_url: imageUrl });
    } catch (e) {
      alert(e?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[92%] max-w-sm p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Quick setup</h3>
          <button className="text-gray-500 hover:text-black" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <label className="block text-sm mb-1">Name (required)</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="flex items-start gap-3 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-500">No photo</span>}
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">Photo (required)</label>
            <button className="px-3 py-2 rounded-lg border" type="button" onClick={() => inputRef.current?.click()}>
              Choose file
            </button>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPickFile} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className={`px-4 py-2 rounded-lg text-white ${canSave ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
            disabled={!canSave || busy}
            onClick={handleSave}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
