import mongoose, { Schema } from 'mongoose';

const EventSchema = new Schema({
    name: { type: String, required: true },
    date: { type: String, required: true },
    registrationOpen: { type: Boolean, default: true },
    entryPassImage: { type: String }, // Custom template URL
    formConfig: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, enum: ['text', 'select', 'checkbox', 'email', 'phone', 'number'], required: true },
        required: { type: Boolean, default: false },
        options: [{ type: String }], // For select type
        enabled: { type: Boolean, default: true },
        isSystem: { type: Boolean, default: false }, // true for default fields like Name, Email, etc.
    }],
    created_at: { type: Date, default: Date.now },
});

// Use 'Event' (singular) -> 'events' collection
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

const AttendeeSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: false, index: true },
    additionalName: { type: String }, // For edit option
    seatingNumber: { type: String }, // Assigned based on category
    instagram: { type: String },
    youtube: { type: String },
    category: { type: String },
    guest_names: { type: String },
    meal_preference: { type: String, enum: ['veg', 'non-veg'], default: 'veg' },
    customResponses: { type: Map, of: String }, // Stores responses Key: Field ID, Value: Response
    status: { type: String, enum: ['registered', 'checked-in'], default: 'registered' },
    checked_in_at: { type: Date },
    guest_checked_in: { type: Boolean, default: false },
    guest_checked_in_at: { type: Date },
    created_at: { type: Date, default: Date.now },
});

const InviteCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Compound index for faster invite lookups
InviteCodeSchema.index({ code: 1, eventId: 1 });

export const Attendee = mongoose.models.Attendee || mongoose.model('Attendee', AttendeeSchema);
export const InviteCode = mongoose.models.InviteCode || mongoose.model('InviteCode', InviteCodeSchema);

// Award Category Schema - defines voting categories for an event
const AwardCategorySchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    showResults: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Vote Schema - tracks individual votes
const VoteSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardCategory', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    nomineeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee', required: true },
    voterPhone: { type: String }, // Optional for backward compatibility
    voterEmail: { type: String }, // Email for Google OAuth users
    voterName: { type: String, required: true },
    voteWeight: { type: Number, default: 1 }, // Admin votes count as 20
    createdAt: { type: Date, default: Date.now },
});

// Compound indexes for efficient lookups
VoteSchema.index({ categoryId: 1, voterPhone: 1 });
VoteSchema.index({ categoryId: 1, voterEmail: 1 });

export const AwardCategory = mongoose.models.AwardCategory || mongoose.model('AwardCategory', AwardCategorySchema);
export const Vote = mongoose.models.Vote || mongoose.model('Vote', VoteSchema);

// Standalone Award Event Schema - separate from attendance events
const AwardEventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    headerImage: { type: String }, // Event banner/header image URL
    sponsorImages: [{ type: String }], // Array of sponsor logo URLs
    digitalMediaSponsorIndex: { type: Number, default: -1 }, // Index of sponsor to show as Digital Media Sponsor (-1 = none)
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// Nominee Schema - separate nominees for award voting
const NomineeSchema = new mongoose.Schema({
    awardEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardEvent', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardCategory', index: true },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    position: { type: Number, default: 0 }, // Position for ordering within category
    createdAt: { type: Date, default: Date.now },
});

export const AwardEvent = mongoose.models.AwardEvent || mongoose.model('AwardEvent', AwardEventSchema);
export const Nominee = mongoose.models.Nominee || mongoose.model('Nominee', NomineeSchema);

// OTP Schema - temporary storage for phone verification
const OTPSchema = new mongoose.Schema({
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Auto-delete expired OTPs (TTL index)
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


export const OTP = mongoose.models.OTP || mongoose.model('OTP', OTPSchema);

// Award Recipient Schema - for Excel upload and token generation
const AwardRecipientSchema = new mongoose.Schema({
    awardEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardEvent', required: true, index: true },
    name: { type: String, required: true },
    followerCount: { type: Number, default: 0 },
    token: { type: String, required: true, unique: true },
    additionalName: { type: String },
    category: { type: String },
    status: { type: String, default: 'generated' }, // generated, redeemed, etc.
    createdAt: { type: Date, default: Date.now },
});

export const AwardRecipient = mongoose.models.AwardRecipient || mongoose.model('AwardRecipient', AwardRecipientSchema);

// ---- Competitions module (organizations, fests, teams, programs, judging, standings) ----

// Organization - a tenant. Everything below Fest belongs to exactly one of these.
// product-admin accounts sit above all organizations and have no organizationId.
const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});
export const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);

// User - multi-role auth (product-admin, super-admin, event-admin, judge, student)
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, index: true, sparse: true },
    phone: { type: String, index: true, sparse: true },
    username: { type: String, index: true, sparse: true }, // student login handle - first name, deduped with a numeric suffix
    passwordHash: { type: String }, // for product-admin / super-admin / event-admin / judge / student credentials login
    role: { type: String, enum: ['product-admin', 'super-admin', 'event-admin', 'judge', 'student'], required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true }, // unset only for product-admin
    festIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fest' }], // scopes event-admin / judge access within their org
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }, // set for role: 'student'
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});
export const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Fest - top-level competition/festival container, sibling to Event/AwardEvent, owned by one Organization
const FestSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // optional link for shared registration/QR
    pointsScheme: { type: Map, of: Number, default: { '1': 10, '2': 7, '3': 5 } },
    teamPointsMultiplier: { type: Number, default: 1 },
    resultsArePublic: { type: Boolean, default: false },
    certificateTemplate: { type: String },
    posterTemplate: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});
export const Fest = mongoose.models.Fest || mongoose.model('Fest', FestSchema);

// Team - competes within a Fest
const TeamSchema = new mongoose.Schema({
    festId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fest', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String },
    color: { type: String },
    logoUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
});
TeamSchema.index({ festId: 1, name: 1 }, { unique: true });
export const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);

// Participant - a fest-scoped person, optionally backed by an Attendee (QR/check-in reuse)
// and optionally by a User (student portal login)
const ParticipantSchema = new mongoose.Schema({
    festId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fest', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee' },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});
export const Participant = mongoose.models.Participant || mongoose.model('Participant', ParticipantSchema);

// Program - a competition item (solo/team, stage/off-stage) within a Fest
const ProgramSchema = new mongoose.Schema({
    festId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fest', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String },
    type: { type: String, enum: ['solo', 'team'], required: true },
    mode: { type: String, enum: ['stage', 'off-stage'], required: true },
    category: { type: String },
    scheduledAt: { type: Date },
    venue: { type: String },
    posterUrl: { type: String },
    status: {
        type: String,
        enum: ['scheduled', 'chest-numbers-shuffled', 'in-progress', 'judging-closed', 'results-published'],
        default: 'scheduled',
    },
    criteria: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        maxScore: { type: Number, default: 10 },
        weight: { type: Number, default: 1 },
    }],
    judgePanel: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resultsPublished: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});
export const Program = mongoose.models.Program || mongoose.model('Program', ProgramSchema);

// ProgramEntry - links a Participant (solo) or Team (team program) to a Program with a
// freshly shuffled-per-program chest number, hiding identity from judges.
const ProgramEntrySchema = new mongoose.Schema({
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    chestNumber: { type: String }, // assigned by the shuffle step, not at entry-creation time
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    disqualified: { type: Boolean, default: false },
    rank: { type: Number },
    totalScore: { type: Number },
    createdAt: { type: Date, default: Date.now },
});
// NOTE: `sparse: true` alone does NOT skip these documents - for a compound index,
// Mongo only omits a doc from a sparse index if ALL indexed fields are missing, and
// programId is always present. Since chestNumber/participantId/teamId are each
// optional on their own (assigned later, or mutually exclusive by entry type), a
// plain sparse index would still index every doc with the missing field as `null`
// and falsely collide. partialFilterExpression is what actually excludes them.
ProgramEntrySchema.index(
    { programId: 1, chestNumber: 1 },
    { unique: true, partialFilterExpression: { chestNumber: { $exists: true } } }
);
ProgramEntrySchema.index(
    { programId: 1, participantId: 1 },
    { unique: true, partialFilterExpression: { participantId: { $exists: true } } }
);
ProgramEntrySchema.index(
    { programId: 1, teamId: 1 },
    { unique: true, partialFilterExpression: { teamId: { $exists: true } } }
);
export const ProgramEntry = mongoose.models.ProgramEntry || mongoose.model('ProgramEntry', ProgramEntrySchema);

// Score - one doc per (judge, entry); criteriaScores map keeps this a single upsertable
// document per judge submission, mirroring the Attendee.customResponses Map pattern.
const ScoreSchema = new mongoose.Schema({
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgramEntry', required: true, index: true },
    judgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    criteriaScores: { type: Map, of: Number, required: true },
    total: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
});
ScoreSchema.index({ programId: 1, entryId: 1, judgeId: 1 }, { unique: true });
export const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema);
