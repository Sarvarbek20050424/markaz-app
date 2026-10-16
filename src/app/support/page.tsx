'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function SupportPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  // Kontakt ma'lumotlari (Sizning ma'lumotlaringiz bilan to'ldirildi)
  const contactInfo = {
    telegram: '@sarvarbek_turgunboyev',
    phone: '+998935332999',
    email: 'turgunboyevsarvarbek8@gmail.com'
  };

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="text-textMuted hover:text-primary flex items-center gap-1"
          >
            ← Bosh sahifa
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Yordam va Qo'llab-quvvatlash</h1>
        </div>
        
        <button 
          onClick={signOut}
          className="bg-danger text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Chiqish
        </button>
      </div>

      {/* Platforma haqida */}
      <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-secondary mb-3">🏫 Markaz platformasi haqida</h2>
        <p className="text-textMuted leading-relaxed">
          Bu platforma o'quv markazidagi o'quvchilarning davomati, o'zlashtirishi va haftalik mavzularni 
          boshqarish uchun yaratilgan. Tizim orqali siz davomatni belgilashingiz, baholarni kiritishingiz, 
          mavzularni yozishingiz va to'liq hisobotlarni PDF yoki Excel formatida yuklab olishingiz mumkin.
        </p>
      </div>

      {/* Asosiy funksiyalar bo'yicha qo'llanma (Qisqartirilgan ko'rinishda, oldingidek qoladi) */}
      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-bold text-secondary">🎯 Asosiy funksiyalar</h2>
        <div className="bg-surface p-6 rounded-card shadow-sm border-l-4 border-success">
          <h3 className="text-lg font-bold text-textMain mb-2">📋 Davomat</h3>
          <p className="text-textMuted">Haftalik davomatni belgilash. "Hammasi keldi" tugmasi orqali tez kiritish.</p>
        </div>
        <div className="bg-surface p-6 rounded-card shadow-sm border-l-4 border-warning">
          <h3 className="text-lg font-bold text-textMain mb-2">📊 Baholar</h3>
          <p className="text-textMuted">Math va English fanlari bo'yicha foizlarni kiritish. Tizim o'rtachasini avtomatik hisoblaydi.</p>
        </div>
        <div className="bg-surface p-6 rounded-card shadow-sm border-l-4 border-blue-500">
          <h3 className="text-lg font-bold text-textMain mb-2">📚 Haftalik mavzular</h3>
          <p className="text-textMuted">Har kun o'tilgan va keyingi mavzularni yozib borish.</p>
        </div>
        <div className="bg-surface p-6 rounded-card shadow-sm border-l-4 border-purple-500">
          <h3 className="text-lg font-bold text-textMain mb-2">📑 Hisobotlar</h3>
          <p className="text-textMuted">To'liq haftalik hisobotlarni PDF yoki Excel formatida yuklab olish.</p>
        </div>
      </div>

      {/* Kontakt ma'lumotlari (TUZATILDI) */}
      <div className="bg-gradient-to-br from-primary to-secondary p-6 rounded-card shadow-lg text-white mb-6">
        <h2 className="text-xl font-bold mb-4">❓ Savollaringiz bormi?</h2>
        <p className="mb-4 opacity-90">
          Platforma bo'yicha savollaringiz bo'lsa yoki texnik yordam kerak bo'lsa, quyidagi kontaktlar orqali bog'laning:
        </p>
        
        <div className="space-y-3">
          <a 
            href={`https://t.me/${contactInfo.telegram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-card transition-colors"
          >
            <div className="text-2xl">💬</div>
            <div>
              <p className="font-semibold">Telegram</p>
              <p className="text-sm opacity-90">{contactInfo.telegram}</p>
            </div>
          </a>
          
          <a 
            href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-card transition-colors"
          >
            <div className="text-2xl">📞</div>
            <div>
              <p className="font-semibold">Telefon</p>
              <p className="text-sm opacity-90">{contactInfo.phone}</p>
            </div>
          </a>
          
          {contactInfo.email && (
            <a 
              href={`mailto:${contactInfo.email}`}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-card transition-colors"
            >
              <div className="text-2xl">✉️</div>
              <div>
                <p className="font-semibold">Email</p>
                <p className="text-sm opacity-90">{contactInfo.email}</p>
              </div>
            </a>
          )}
        </div>
      </div>

      {/* Qo'shimcha ma'lumot */}
      <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100 text-center">
        <p className="text-textMuted text-sm">
          © 2026 Markaz. Barcha huquqlar himoyalangan.
        </p>
        <p className="text-textMuted text-xs mt-2">
          Versiya 1.0 | Oxirgi yangilanish: 17.10.2026
        </p>
      </div>
    </main>
  );
}