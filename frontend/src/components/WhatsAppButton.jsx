import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './WhatsAppButton.css';

const PHONE_NUMBER = '972501234567'; // international format without + or spaces
const DEFAULT_MESSAGE = 'Hi! I have a question about AC Commerce products/services.';

export default function WhatsAppButton() {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const handleClick = () => {
    const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="wa-float">
      {/* Tooltip bubble */}
      {tooltipOpen && (
        <div className="wa-tooltip">
          <button
            className="wa-tooltip__close"
            onClick={(e) => { e.stopPropagation(); setTooltipOpen(false); }}
            aria-label="Close"
          >
            <FaTimes />
          </button>
          <p className="wa-tooltip__title">Need help?</p>
          <p className="wa-tooltip__text">
            Chat with us on WhatsApp for quick support with orders, installations, or product questions.
          </p>
          <button className="wa-tooltip__cta" onClick={handleClick}>
            Start Chat
          </button>
        </div>
      )}

      {/* Floating button */}
      <button
        className="wa-btn"
        onClick={() => setTooltipOpen((prev) => !prev)}
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <svg viewBox="0 0 32 32" className="wa-btn__icon">
          <path
            fill="#fff"
            d="M16.004 0C7.165 0 .002 7.163.002 16c0 2.825.737 5.574 2.137 7.998L.074 32l8.204-2.032A15.94 15.94 0 0 0 16.004 32C24.837 32 32 24.837 32 16S24.837 0 16.004 0zm0 29.39a13.36 13.36 0 0 1-6.81-1.868l-.488-.29-5.065 1.328 1.352-4.937-.318-.505a13.31 13.31 0 0 1-2.042-7.118c0-7.38 6.007-13.387 13.39-13.387 7.38 0 13.387 6.007 13.387 13.387 0 7.383-6.026 13.39-13.406 13.39zm7.336-10.023c-.402-.201-2.379-1.174-2.748-1.308-.37-.134-.638-.201-.907.201-.268.402-1.04 1.308-1.275 1.576-.235.268-.47.302-.872.1-.402-.2-1.697-.625-3.233-1.993-1.195-1.065-2.001-2.38-2.236-2.782-.235-.402-.025-.62.177-.82.181-.18.402-.47.604-.704.201-.235.268-.402.402-.67.134-.268.067-.503-.034-.704-.1-.201-.907-2.186-1.242-2.993-.327-.787-.66-.68-.907-.693l-.772-.013c-.268 0-.704.1-1.073.503-.37.402-1.41 1.376-1.41 3.36 0 1.983 1.444 3.898 1.645 4.166.201.268 2.84 4.334 6.882 6.078.961.415 1.712.663 2.297.849.965.306 1.843.263 2.537.16.774-.116 2.379-.972 2.715-1.91.335-.94.335-1.745.235-1.911-.1-.168-.37-.268-.772-.47z"
          />
        </svg>
        <span className="wa-btn__pulse" />
      </button>
    </div>
  );
}
