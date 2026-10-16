'use client';

import { useState, useEffect } from 'react';

export default function RealTimeClock() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Vaqtni formatlash va yangilash funksiyasi
    const updateTime = () => {
      const now = new Date();
      const formattedTime = now.toLocaleString('uz-UZ', {
        weekday: 'long',      // Dushanba, Seshanba...
        year: 'numeric',      // 2026
        month: 'long',        // Oktyabr
        day: 'numeric',       // 17
        hour: '2-digit',      // 14
        minute: '2-digit',    // 30
        second: '2-digit',    // 45
      });
      setCurrentTime(formattedTime);
    };

    updateTime(); // Dastlabki yuklanishda darhol chaqirish
    const timer = setInterval(updateTime, 1000); // Har 1 soniyada yangilash

    // Komponent o'chirilganda taymerni tozalash (xotira sizib chiqishining oldini olish)
    return () => clearInterval(timer);
  }, []);

  if (!currentTime) return null;

  return (
    <div className="fixed top-3 right-3 md:top-5 md:right-5 z-40 flex items-center gap-2 text-xs md:text-sm text-textMuted bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-card border border-gray-100 shadow-sm">
      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-medium tracking-wide capitalize">
        {currentTime}
      </span>
    </div>
  );
}