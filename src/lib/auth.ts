import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { escapeRegex } from '@/lib/studentAuth';

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            id: 'admin-credentials',
            name: 'Admin/Judge Login',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                await dbConnect();
                const user = await User.findOne({
                    email: credentials.email.toLowerCase().trim(),
                    role: { $in: ['product-admin', 'super-admin', 'event-admin', 'judge'] },
                    isActive: true,
                });
                if (!user || !user.passwordHash) return null;

                const valid = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!valid) return null;

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    organizationId: user.organizationId ? String(user.organizationId) : undefined,
                    festIds: (user.festIds || []).map((f: unknown) => String(f)),
                };
            },
        }),
        CredentialsProvider({
            id: 'student-credentials',
            name: 'Student Login',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                await dbConnect();
                const user = await User.findOne({
                    username: { $regex: `^${escapeRegex(credentials.username.trim())}$`, $options: 'i' },
                    role: 'student',
                    isActive: true,
                });
                if (!user || !user.passwordHash) return null;

                const valid = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!valid) return null;

                return {
                    id: user._id.toString(),
                    name: user.name,
                    role: user.role,
                    organizationId: user.organizationId ? String(user.organizationId) : undefined,
                    participantId: user.participantId ? String(user.participantId) : undefined,
                };
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, account, profile, user, trigger }) {
            if (account && profile) {
                // Google OAuth voter identity (existing /awards/[id]/vote flow) - unchanged
                token.email = profile.email;
            }
            if (user) {
                const u = user as unknown as { role?: string; organizationId?: string; festIds?: string[]; participantId?: string; id?: string };
                if (u.role) token.role = u.role;
                if (u.organizationId) token.organizationId = u.organizationId;
                if (u.festIds) token.festIds = u.festIds;
                if (u.participantId) token.participantId = u.participantId;
                if (u.id) token.userId = u.id;
            }
            // Explicit client-side session.update() call - used right after the
            // onboarding step sets a Super Admin's organizationId for the first time,
            // so the session reflects it without a full re-login.
            if (trigger === 'update' && token.userId) {
                await dbConnect();
                const fresh = await User.findById(token.userId).select('organizationId').lean();
                if (fresh?.organizationId) token.organizationId = String(fresh.organizationId);
            }
            return token;
        },
        async session({ session, token }) {
            if (token.email && session.user) {
                session.user.email = token.email as string;
            }
            if (session.user) {
                session.user.role = token.role as string | undefined;
                session.user.organizationId = token.organizationId as string | undefined;
                session.user.festIds = token.festIds as string[] | undefined;
                session.user.participantId = token.participantId as string | undefined;
                session.user.id = token.userId as string | undefined;
            }
            return session;
        },
    },
};
