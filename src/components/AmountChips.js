import React from "react";

const PRESETS = [5, 10, 25, 50, 100];

export default function AmountChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {PRESETS.map((p) => {
        const active = Number(value) === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={
              "px-4 py-2 rounded-full border " +
              (active ? "bg-black text-white border-black" : "border-gray-300")
            }
          >
            ${p}
          </button>
        );
      })}
    </div>
  );
}
