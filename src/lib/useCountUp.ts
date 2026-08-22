'use client';
import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 600) {
    const [value, setValue] = useState(target);
    const fromRef = useRef(target);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const from = fromRef.current;
        if (from === target) return;
        const start = performance.now();

        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(from + (target - from) * eased));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = target;
            }
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [target, duration]);

    return value;
}
