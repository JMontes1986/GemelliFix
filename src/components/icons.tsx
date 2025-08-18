
import type { SVGProps } from 'react';
import Image from 'next/image';

export function GemelliFixLogo(props: { className?: string }) {
  return (
    <Image 
      src="https://placehold.co/220x280.png" 
      alt="GemelliFix Logo Placeholder" 
      width={220} 
      height={280} 
      className={props.className}
      priority
      data-ai-hint="logo"
    />
  );
}
