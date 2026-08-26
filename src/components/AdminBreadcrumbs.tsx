'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
    label: string;
    href?: string;
}

// Full ancestor trail for admin pages, e.g. Competitions / Silverline Fest / Programs /
// Solo Singing - lets you jump back to ANY level, not just the immediate parent (the old
// single ArrowLeft-back-button pattern only ever went one level up).
export default function AdminBreadcrumbs({ items }: { items: Crumb[] }) {
    return (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap -mx-1 px-1 pb-0.5">
            {items.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 shrink-0">
                    {i > 0 && <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />}
                    {item.href ? (
                        <Link href={item.href} className="hover:text-white transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-white font-medium">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
