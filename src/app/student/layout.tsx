import Providers from '@/components/Providers';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return <Providers>{children}</Providers>;
}
