import React, { useEffect, useState } from 'react';
import { mainColor } from '../config/Colors';
import Text from '../config/Text';
import logo2 from '../assets/logo-2.svg';

function Footer() {
  const [footerSize, setFooterSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const footerElement = document.getElementById('footer-container');
    if (!footerElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setFooterSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(footerElement);

    return () => {
      resizeObserver.unobserve(footerElement);
    };
  }, []);

  // Similar scaling logic as coupon side: 10% of container width
  const dynamicSize = footerSize.width * 0.10;

  return (
    <div
      id="footer-container"
      className="w-full flex-shrink-0 bg-white border-t flex items-center justify-between px-[5%] py-[2.5%]"
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* Dynamically scaled logo similar to coupon scaling */}
      <img
        src={logo2}
        alt="Logo"
        style={{ height: dynamicSize || 'auto', width: 'auto', objectFit: 'contain' }}
      />

      <div className="flex space-x-4">
        <a
          href="https://wa.me/your-whatsapp-number"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          <Text
            type="small"
            role="tertiary"
            isClickable
            className="hover:underline hover:font-semibold text-center"
          >
            Message
          </Text>
        </a>
        <a
          href="/readme"
          className="flex items-center justify-center"
        >
          <Text
            type="small"
            role="tertiary"
            isClickable
            className="hover:underline hover:font-semibold text-center"
          >
            README
          </Text>
        </a>
      </div>
    </div>
  );
}

export default Footer;
