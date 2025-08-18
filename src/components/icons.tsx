import type { SVGProps } from 'react';
import Image from 'next/image';

export function GemelliFixLogo(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <Image 
      src="/logo.png" 
      alt="GemelliFix Logo" 
      width={160} 
      height={32} 
      className={props.className}
      style={{ filter: 'brightness(0) saturate(100%) invert(20%) sepia(29%) saturate(2283%) hue-rotate(187deg) brightness(96%) contrast(93%)' }}
    />
  );
}
