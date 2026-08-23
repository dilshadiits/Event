import crypto from 'crypto';
import { ProgramEntry } from '@/models';

// Cryptographically-random Fisher-Yates shuffle (crypto.randomInt, not Math.random -
// chest numbers gate blind judging, so the assignment must not be predictable).
function shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Fixed-width zero-padded numeric codes ("01".."99", or wider once entry count demands it).
function buildCodePool(size: number): string[] {
    let width = 2;
    while (Math.pow(10, width) - 1 < size) width++;
    const pool: string[] = [];
    for (let i = 1; i <= Math.pow(10, width) - 1; i++) pool.push(String(i).padStart(width, '0'));
    return pool;
}

// Assigns a fresh, unique-per-program chest number to every entry passed in.
// The (programId, chestNumber) unique index in the schema is a DB-level backstop
// against a bug here ever producing a collision.
export async function shuffleChestNumbers(programId: string, entryIds: string[]): Promise<void> {
    if (entryIds.length === 0) return;

    const codes = shuffle(buildCodePool(entryIds.length)).slice(0, entryIds.length);

    await ProgramEntry.bulkWrite(
        entryIds.map((id, idx) => ({
            updateOne: {
                filter: { _id: id, programId },
                update: { $set: { chestNumber: codes[idx] } },
            },
        }))
    );
}
