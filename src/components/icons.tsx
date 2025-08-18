
import type { SVGProps } from 'react';
import Image from 'next/image';

export function GemelliFixLogo(props: { className?: string }) {
  return (
    <Image 
      src="/logo.png" 
      alt="GemelliFix Logo" 
      width={180} 
      height={280} 
      className={props.className}
      priority
      data-ai-hint="logo"
    />
  );
}
