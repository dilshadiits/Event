const GRADIENTS = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-red-500',
    'from-emerald-500 to-teal-500',
    'from-indigo-500 to-violet-500',
    'from-rose-500 to-orange-400',
];

export function posterGradient(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return GRADIENTS[hash % GRADIENTS.length];
}
