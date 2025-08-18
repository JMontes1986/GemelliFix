
import type { SVGProps } from 'react';
import Image from 'next/image';

export function GemelliFixLogo(props: { className?: string }) {
  return (
    <Image 
      src="/logo.png" 
      alt="GemelliFix Logo" 
      width={160} 
      height={32} 
      className={props.className}
    />
  );
}
