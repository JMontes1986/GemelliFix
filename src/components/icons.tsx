import type { SVGProps } from 'react';

export function GemelliFixLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 40"
      width="200"
      height="40"
      {...props}
    >
      <style>
        {
          '.logo-text { font-family: "Montserrat", sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -1px; }'
        }
      </style>
      <rect width="40" height="40" rx="8" fill="hsl(var(--primary))" />
      <path d="M15 10 L25 20 L15 30" stroke="#FFE74C" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="50" y="29" className="logo-text" fill="hsl(var(--primary))">
        Gemelli
        <tspan fill="hsl(var(--accent))" dx="-5">Fix</tspan>
      </text>
    </svg>
  );
}
