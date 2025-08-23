// src/components/Onboard.js
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

const BUCKET = "publicbucket";
const FOLDER = "avatars";

function makeKey(ext = "jpg") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${FOLDER}/${Date.now()}-${rand}.${ext.replace(/^\./, "")}`;
}

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

  const upload = async () => {
    if (!file) return current?.image_url || null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = makeKey(ext);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
    if (error) throw new Error(error.message || "Upload failed");
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return data.publicUrl;
  };

  const handleSave = async () => {
    try {
      if (!canSave) return;
      setBusy(true);
      const imageUrl = await upload();
      if (!imageUrl) throw new Error("Please choose a photo.");
      // Hand back to parent; LocalUserContext will auto-upsert to API
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
