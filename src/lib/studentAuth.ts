import { User } from '@/models';

// Student portal usernames are generated from the participant's first name -
// "Adithyan Dileep" -> "Adithyan". Collisions get a numeric suffix (Adithyan2,
// Adithyan3, ...). Matching is case-insensitive at login (see auth.ts), so
// uniqueness here also has to be checked case-insensitively.
export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function baseUsername(name: string): string {
    const first = name.trim().split(/\s+/)[0] || '';
    const cleaned = first.replace(/[^a-zA-Z0-9]/g, '');
    return cleaned || 'student';
}

export async function generateUniqueUsername(name: string): Promise<string> {
    const base = baseUsername(name);
    let candidate = base;
    let suffix = 2;
    // Small dataset (participants per fest) - a sequential existence check per
    // candidate is simpler and plenty fast here, no need for a reservation table.
    while (await User.findOne({ username: { $regex: `^${escapeRegex(candidate)}$`, $options: 'i' } })) {
        candidate = `${base}${suffix}`;
        suffix += 1;
    }
    return candidate;
}
