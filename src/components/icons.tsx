
import type { SVGProps } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function GemelliFixLogo(props: { className?: string }) {
  return (
    <Image 
      src="https://firebasestorage.googleapis.com/v0/b/gemellifix.firebasestorage.app/o/Logo.png?alt=media&token=3c91d664-c1d3-43b0-b81f-2b21a7cf2c05" 
      alt="GemelliFix Logo" 
      width={1024} 
      height={256} 
      className={cn("h-auto w-full", props.className)}
      data-ai-hint="logo"
    />
  );
}
