import Mehfil from '@/components/mehfil/Mehfil';

export default function MehfilPage() {
    return <Mehfil backendUrl={import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'} />;
}
