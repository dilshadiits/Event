import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User, OTP } from '@/models';

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
}

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
                    role: { $in: ['super-admin', 'event-admin', 'judge'] },
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
                    festIds: (user.festIds || []).map((f: unknown) => String(f)),
                };
            },
        }),
        CredentialsProvider({
            id: 'student-otp',
            name: 'Student Login',
            credentials: {
                phone: { label: 'Phone', type: 'text' },
                otp: { label: 'OTP', type: 'text' },
            },
            async authorize(credentials) {
                if (!credentials?.phone || !credentials?.otp) return null;
                const phone = normalizePhone(credentials.phone);

                await dbConnect();
                const otp = await OTP.findOne({
                    phone,
                    code: credentials.otp,
                    expiresAt: { $gt: new Date() },
                });
                if (!otp) return null;

                const user = await User.findOne({ phone, role: 'student', isActive: true });
                if (!user) return null;

                return {
                    id: user._id.toString(),
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                    participantId: user.participantId ? String(user.participantId) : undefined,
                };
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, account, profile, user }) {
            if (account && profile) {
                // Google OAuth voter identity (existing /awards/[id]/vote flow) — unchanged
                token.email = profile.email;
            }
            if (user) {
                const u = user as unknown as { role?: string; festIds?: string[]; participantId?: string; id?: string };
                if (u.role) token.role = u.role;
                if (u.festIds) token.festIds = u.festIds;
                if (u.participantId) token.participantId = u.participantId;
                if (u.id) token.userId = u.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.email && session.user) {
                session.user.email = token.email as string;
            }
            if (session.user) {
                session.user.role = token.role as string | undefined;
                session.user.festIds = token.festIds as string[] | undefined;
                session.user.participantId = token.participantId as string | undefined;
                session.user.id = token.userId as string | undefined;
            }
            return session;
        },
    },
};
