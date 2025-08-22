// src/components/Footer.jsx
import React from "react";
import Text from "../config/Text";
import logo2 from "../assets/logo-2.svg";

function Footer() {
  return (
    <div
      id="footer-container"
      className="flex-shrink-0 w-full bg-white border-t flex items-center justify-between px-4 py-3 text-sm leading-none"
      // ^ text-sm sets the base size; the logo uses 1em, so it matches the links
    >
      <img
        src={logo2}
        alt="OPENMAT"
        className="h-[1em] w-auto object-contain"
      />

      <div className="flex space-x-4">
        <a
          href="https://chat.whatsapp.com/D4cbTC5qnU1GNcS5XDA88h"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Text
            type="small"
            role="tertiary"
            isClickable
            className="hover:underline hover:font-semibold"
          >
            Message
          </Text>
        </a>
        <a href="https://docs.google.com/document/d/1ophMfrInMdQ55ooWra1ejJv8-AxLPQteKB8bIDK8r0Y/edit?usp=sharing">
          <Text
            type="small"
            role="tertiary"
            isClickable
            className="hover:underline hover:font-semibold"
          >
            ReadMe
          </Text>
        </a>
      </div>
    </div>
  );
}

export default Footer;
