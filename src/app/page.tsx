'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary text-xl font-semibold animate-pulse">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Bosh sahifa</h1>
          <p className="text-textMuted mt-1">Xush kelibsiz, {user.email}</p>
        </div>
        <button 
          onClick={signOut}
          className="bg-danger text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Chiqish
        </button>
      </header>

      {/* Asosiy bo'limlar kartochkalari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/groups" className="bg-surface p-5 rounded-card shadow-sm border-l-4 border-primary hover:shadow-md transition-shadow block">
          <p className="text-textMuted text-sm font-medium">Boshqaruv</p>
          <p className="text-xl font-bold text-textMain mt-2">Guruhlar va O'quvchilar</p>
          <p className="text-primary text-sm mt-2">Ro'yxatni ko'rish va tahrirlash →</p>
        </Link>
        
        <Link href="/attendance" className="bg-surface p-5 rounded-card shadow-sm border-l-4 border-success hover:shadow-md transition-shadow block">
          <p className="text-textMuted text-sm font-medium">Jarayon</p>
          <p className="text-xl font-bold text-textMain mt-2">Davomat</p>
          <p className="text-success text-sm mt-2">Haftalik davomatni belgilash →</p>
        </Link>

        <Link href="/scores" className="bg-surface p-5 rounded-card shadow-sm border-l-4 border-warning hover:shadow-md transition-shadow block">
          <p className="text-textMuted text-sm font-medium">Jarayon</p>
          <p className="text-xl font-bold text-textMain mt-2">Baholar</p>
          <p className="text-warning text-sm mt-2">O'zlashtirish va uy vazifa →</p>
        </Link>

        <Link href="/topics" className="bg-surface p-5 rounded-card shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow block">
          <p className="text-textMuted text-sm font-medium">Jarayon</p>
          <p className="text-xl font-bold text-textMain mt-2">Mavzular</p>
          <p className="text-blue-500 text-sm mt-2">Haftalik mavzularni kiritish →</p>
        </Link>
      </div>

      {/* Ikkinchi qator: Hisobotlar va Yordam */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link href="/reports" className="bg-surface p-5 rounded-card shadow-sm border-l-4 border-purple-500 hover:shadow-md transition-shadow block">
          <p className="text-textMuted text-sm font-medium">Hisobot</p>
          <p className="text-xl font-bold text-textMain mt-2">Hisobotlar</p>
          <p className="text-purple-500 text-sm mt-2">PDF va Excel yuklash →</p>
        </Link>

        <Link href="/support" className="bg-surface p-5 rounded-card shadow-sm border-l-4 border-gray-500 hover:shadow-md transition-shadow block">
          <p className="text-textMuted text-sm font-medium">Yordam</p>
          <p className="text-xl font-bold text-textMain mt-2">Qo'llab-quvvatlash</p>
          <p className="text-gray-500 text-sm mt-2">Qo'llanma va kontaktlar →</p>
        </Link>
      </div>

      {/* Diagrammalar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Davomat diagrammasi */}
        <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-secondary mb-4">Haftalik Davomat</h3>
          <Bar
            data={{
              labels: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma'],
              datasets: [{
                label: 'Davomat %',
                data: [85, 82, 88, 90, 87],
                backgroundColor: 'rgba(46, 158, 91, 0.6)',
                borderColor: '#2E9E5B',
                borderWidth: 2
              }]
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, max: 100 } }
            }}
          />
        </div>

        {/* O'zlashtirish diagrammasi */}
        <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-secondary mb-4">O'zlashtirish (Math vs English)</h3>
          <Line
            data={{
              labels: ['1-hafta', '2-hafta', '3-hafta', '4-hafta'],
              datasets: [
                {
                  label: 'Math',
                  data: [75, 78, 82, 85],
                  borderColor: '#2F5597',
                  backgroundColor: 'rgba(47, 85, 151, 0.1)',
                  tension: 0.4
                },
                {
                  label: 'English',
                  data: [70, 75, 78, 80],
                  borderColor: '#F0A202',
                  backgroundColor: 'rgba(240, 162, 2, 0.1)',
                  tension: 0.4
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: { legend: { position: 'top' } },
              scales: { y: { beginAtZero: true, max: 100 } }
            }}
          />
        </div>
      </div>
    </main>
  );
}