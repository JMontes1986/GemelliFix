
'use client'

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

  return (
    <div className="grid flex-1 md:grid-cols-[200px_1fr] gap-6">
        <aside className="hidden w-[200px] flex-col md:flex">
            <nav className="grid gap-1 text-sm text-muted-foreground">
                 <Link 
                    href="/settings"
                    className={`font-semibold text-primary ${isActive('/settings') ? 'font-bold' : ''}`}
                 >
                    General
                </Link>
                <Link
                    href="/settings/logs"
                    className={`font-semibold text-primary ${isActive('/settings/logs') ? 'font-bold' : ''}`}
                >
                    Logs del Sistema
                </Link>
            </nav>
        </aside>
        <main>
            {children}
        </main>
    </div>
  )
}
