// src/components/OfferForm.jsx
import React, { useRef, useState } from "react";
import { API_BASE, CREATOR } from "../config/Creator";

export default function OfferForm({ open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState(0);
  const [params, setParams] = useState({ limit: "", expires_at: "" });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  if (!open) return null;

  async function signedUpload(f) {
    if (!f) return null;
    const r = await fetch(`${API_BASE}/api/storage/avatar-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: f.name, contentType: f.type || "image/jpeg" }),
    });
    const j = await r.json();
    await fetch(j.uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": f.type || "application/octet-stream" } });
    return j.publicUrl;
  }

  const save = async () => {
    try {
      setBusy(true);
      const image_url = file ? await signedUpload(file) : null;
      const body = {
        dealId: CREATOR.dealId,
        title: title.trim(),
        image_url,
        price_cents: Math.max(0, Math.round(Number(price || 0) * 100)),
        params: {
          limit: params.limit ? Number(params.limit) : undefined,
          expires_at: params.expires_at || undefined,
        },
      };
      const r = await fetch(`${API_BASE}/api/offers/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "create_failed");
      onCreated?.(j.offer);
    } catch (e) {
      alert(e.message || "Could not create offer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[92%] max-w-sm p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">New Offer</h3>
          <button className="text-gray-500 hover:text-black" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <label className="block text-sm mb-1">Title</label>
        <input className="w-full border rounded-lg px-3 py-2 mb-3" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., Free drop-in" />

        <label className="block text-sm mb-1">Price (USD)</label>
        <input className="w-full border rounded-lg px-3 py-2 mb-3" type="number" min="0" step="1" value={price} onChange={(e)=>setPrice(e.target.value)} />

        <div className="flex items-start gap-3 mb-3">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-500">Image</span>}
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">Image</label>
            <button className="px-3 py-2 rounded-lg border" type="button" onClick={() => inputRef.current?.click()}>Choose file</button>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => {
              const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
            }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm mb-1">Limit (qty)</label>
            <input className="w-full border rounded-lg px-3 py-2" value={params.limit} onChange={(e)=>setParams(p=>({...p,limit:e.target.value}))} placeholder="e.g., 100" />
          </div>
          <div>
            <label className="block text-sm mb-1">Expires (ISO)</label>
            <input className="w-full border rounded-lg px-3 py-2" value={params.expires_at} onChange={(e)=>setParams(p=>({...p,expires_at:e.target.value}))} placeholder="YYYY-MM-DD" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`px-4 py-2 rounded-lg text-white ${title.trim() ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`} disabled={!title.trim() || busy} onClick={save}>
            {busy ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
