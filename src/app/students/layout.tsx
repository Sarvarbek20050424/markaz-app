import { Suspense } from 'react';

export default function StudentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-center">Yuklanmoqda...</div>}>
      {children}
    </Suspense>
  );
}