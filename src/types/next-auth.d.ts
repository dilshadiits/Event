import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user?: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            organizationId?: string;
            festIds?: string[];
            participantId?: string;
            id?: string;
        };
    }

    interface User {
        role?: string;
        organizationId?: string;
        festIds?: string[];
        participantId?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role?: string;
        organizationId?: string;
        festIds?: string[];
        participantId?: string;
        userId?: string;
    }
}
