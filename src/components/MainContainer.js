import React from "react";

function MainContainer({ children }) {
  // add ?safe=1 to soften the glow if a GPU driver is cranky
  const params = new URLSearchParams(window.location.search);
  const safe = params.get("safe") === "1";

  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
      style={{
        position: "absolute",
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        maxWidth: "calc(80vh / 1.618)",
        maxHeight: "80vh",
        aspectRatio: "1 / 1.618",
        width: "100%",
        height: "100%",

        borderRadius: "clamp(30px,3vw,40px)",
        border: "clamp(20px,5vw,40px) solid #1a1a1a",
        boxShadow: safe
          ? "0 0 28px rgba(255,255,255,.35), 0 0 54px rgba(0,0,0,.40)"
          : "0 0 20px rgba(255,255,255,.5), 0 0 40px rgba(192,192,192,.7), 0 0 60px rgba(255,255,255,.4), 0 0 80px rgba(0,0,0,.5)",
        outline: "clamp(4px,1vw,8px) solid rgba(192,192,192,0.8)",
        outlineOffset: "-clamp(4px,1vw,8px)",
        backgroundColor: "#fff",
        isolation: "isolate",
      }}
    >
      {/* KEY: this wrapper enables inner sections to shrink and create scroll areas */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default MainContainer;
