import * as React from "react";

/**
 * The RAJASK mark — a faceted hexagonal "R" rendered from the logo's
 * nine-colour spectrum. Inline SVG so it inherits crispness at any size and
 * needs no asset pipeline.
 */
export function Logo({ size = 40, title = "RAJASK" }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="rajask-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#92278F" />
          <stop offset="20%" stopColor="#EC008C" />
          <stop offset="38%" stopColor="#E2231A" />
          <stop offset="55%" stopColor="#F58220" />
          <stop offset="68%" stopColor="#FDB913" />
          <stop offset="80%" stopColor="#8DC63F" />
          <stop offset="90%" stopColor="#009444" />
          <stop offset="100%" stopColor="#0093D0" />
        </linearGradient>
      </defs>
      <path
        d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z"
        fill="url(#rajask-arc)"
      />
      <path
        d="M38 30 H56 a13 13 0 0 1 0 26 H46 l14 18 H50 L37 56 H38 V72 H30 V30 Z M38 38 V48 H55 a5 5 0 0 0 0 -10 Z"
        fill="#ffffff"
      />
    </svg>
  );
}
