import Providers from '@/components/Providers';

export default function ProductAdminLayout({ children }: { children: React.ReactNode }) {
    return <Providers>{children}</Providers>;
}
