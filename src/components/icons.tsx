
import type { SVGProps } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function GemelliFixLogo(props: { className?: string }) {
  return (
    <Image 
      src="/logo.png" 
      alt="GemelliFix Logo" 
      width={180} 
      height={280} 
      className={cn("h-auto w-full", props.className)}
      priority
      data-ai-hint="logo"
    />
  );
}
