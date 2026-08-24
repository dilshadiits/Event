'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AdminNavCardProps {
    href: string;
    icon: React.ElementType;
    label: string;
    description?: string;
    count?: number;
    accent: string;
    target?: string;
}

// The one pattern for "this card navigates somewhere else" across the admin panel -
// icon chip, label, optional count, and a trailing chevron that shifts on hover. Static
// data cards (stat tiles, charts) deliberately carry none of this - no chevron, no
// hover border/background change - so at a glance, clickable vs. read-only is obvious.
export default function AdminNavCard({ href, icon: Icon, label, description, count, accent, target }: AdminNavCardProps) {
    return (
        <Link
            href={href}
            target={target}
            className="group bg-card border border-border hover:border-white/20 hover:bg-white/3 rounded-xl p-5 transition-all flex items-center justify-between gap-3"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-white truncate">{label}</div>
                    {description && <div className="text-xs text-muted-foreground truncate">{description}</div>}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {count !== undefined && <span className="text-xl font-bold text-white tabular-nums">{count}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
        </Link>
    );
}
