
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function GemelliFixLogo(props: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="GemelliFix Logo" 
      className={cn("h-auto", props.className)}
      data-ai-hint="logo"
    />
  );
}
