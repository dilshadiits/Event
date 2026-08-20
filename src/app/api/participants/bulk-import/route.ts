import * as XLSX from 'xlsx';
import dbConnect from '@/lib/mongodb';
import { Participant, Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId, sanitizeString } from '@/lib/validate';

// POST /api/participants/bulk-import - multipart form: festId + Excel file
// Expected columns: Name (required), Team (optional, matched by name within the fest),
// Email (optional), Phone (optional).
export const POST = withErrorHandler(async (req: Request) => {
    const formData = await req.formData();
    const festId = formData.get('festId');
    const file = formData.get('file');

    if (typeof festId !== 'string' || !isValidObjectId(festId)) {
        return errorResponse('Valid fest ID is required', 400);
    }
    if (!file || !(file instanceof File)) {
        return errorResponse('Excel file is required', 400);
    }

    const caller = await requireOrgFestAccess(festId);
    if (!caller) return errorResponse('Unauthorized', 403);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
        return errorResponse('Excel file is empty or invalid', 400);
    }

    await dbConnect();

    const existingTeams = await Team.find({ festId }).lean();
    const teamByName = new Map(existingTeams.map(t => [t.name.toLowerCase(), t._id]));

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
        const name = row['Name'] || row['name'];
        if (!name || typeof name !== 'string' || !name.trim()) {
            skipped++;
            continue;
        }

        const teamNameRaw = row['Team'] || row['team'];
        const teamName = typeof teamNameRaw === 'string' ? teamNameRaw.trim() : undefined;
        const teamId = teamName ? teamByName.get(teamName.toLowerCase()) : undefined;

        const email = row['Email'] || row['email'];
        const phone = row['Phone'] || row['phone'];

        await Participant.create({
            festId,
            teamId,
            name: sanitizeString(name.trim()),
            email: typeof email === 'string' ? email.trim() : undefined,
            phone: phone !== undefined && phone !== '' ? String(phone).trim() : undefined,
        });
        created++;
    }

    return successResponse({
        created,
        skipped,
        message: `Imported ${created} participant(s)${skipped > 0 ? `, skipped ${skipped} row(s) missing a name` : ''}.`,
    });
});
