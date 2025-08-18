
import type { SVGProps } from 'react';
import Image from 'next/image';

export function GemelliFixLogo(props: { className?: string }) {
  return (
    <Image 
      src="https://placehold.co/240x48.png" 
      alt="GemelliFix Logo Placeholder" 
      width={240} 
      height={48} 
      className={props.className}
      priority
      data-ai-hint="logo"
    />
  );
}
