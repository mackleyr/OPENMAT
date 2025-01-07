// src/components/Footer.jsx
import React, { useEffect, useState } from "react";
import Text from "../config/Text";
import logo2 from "../assets/logo-2.svg";

function Footer() {
  const [footerSize, setFooterSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const footerElement = document.getElementById("footer-container");
    if (!footerElement) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setFooterSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    resizeObserver.observe(footerElement);
    return () => resizeObserver.unobserve(footerElement);
  }, []);

  // scale the logo by 10% of container width
  const dynamicSize = footerSize.width * 0.1;

  return (
    <div
      id="footer-container"
      className="flex-shrink-0 w-full bg-white border-t flex items-center justify-between px-4 py-3"
      style={{ boxSizing: "border-box" }}
    >
      <img
        src={logo2}
        alt="Logo"
        style={{
          height: dynamicSize || "auto",
          width: "auto",
          objectFit: "contain",
        }}
      />

      <div className="flex space-x-4">
        <a href="https://chat.whatsapp.com/D4cbTC5qnU1GNcS5XDA88h" target="_blank" rel="noopener noreferrer">
          <Text type="small" role="tertiary" isClickable className="hover:underline hover:font-semibold">
            Message
          </Text>
        </a>
        <a href="https://docs.google.com/document/d/1ophMfrInMdQ55ooWra1ejJv8-AxLPQteKB8bIDK8r0Y/edit?usp=sharing">
          <Text type="small" role="tertiary" isClickable className="hover:underline hover:font-semibold">
            ReadMe
          </Text>
        </a>
      </div>
    </div>
  );
}

export default Footer;
