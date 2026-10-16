'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Group } from '@/types';
import { getMonday, formatDate, WEEK_DAYS } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

function ReportsContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('*').eq('teacher_id', user?.id);
    if (data) {
      setGroups(data);
      if (data.length > 0) setSelectedGroupId(String(data[0].id));
    }
  };

  // PDF hisobot yaratish
  const generatePDF = async () => {
    if (!selectedGroupId) {
      alert('Guruhni tanlang!');
      return;
    }
    setLoading(true);

    try {
      const doc = new jsPDF();
      const selectedGroup = groups.find(g => g.id === Number(selectedGroupId));

      // Sarlavha
      doc.setFontSize(20);
      doc.setTextColor(47, 85, 151);
      doc.text('Markaz - Haftalik Hisobot', 14, 20);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Guruh: ${selectedGroup?.name || 'Noma\'lum'}`, 14, 30);
      doc.text(`Hafta: ${formatDate(weekStart)} - ${formatDate(new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}`, 14, 36);
      doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 42);

      // O'quvchilarni olish
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('group_id', Number(selectedGroupId))
        .eq('is_active', true);

      if (!students || students.length === 0) {
        alert('Bu guruhda o\'quvchilar yo\'q!');
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);
      const weekEnd = new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1. DAVOMAT
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('student_id, date, status')
        .in('student_id', studentIds)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      const attendanceTableData = students.map(student => {
        const row: any[] = [student.full_name];
        let presentCount = 0;
        let totalCount = 0;

        WEEK_DAYS.forEach((day, index) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + index);
          const dateStr = date.toISOString().split('T')[0];
          const record = attendanceRecords?.find(r => r.student_id === student.id && r.date === dateStr);
          const status = record?.status || '-';
          row.push(status === 'keldi' ? '+' : status === 'kelmadi' ? 'X' : status);
          if (status) {
            totalCount++;
            if (status === 'keldi') presentCount++;
          }
        });

        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        row.push(`${percentage}%`);
        return row;
      });

      autoTable(doc, {
        startY: 50,
        head: [['O\'quvchi', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Davomat %']],
        body: attendanceTableData,
        theme: 'grid',
        headStyles: { fillColor: [47, 85, 151], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 20, halign: 'center' }
        }
      });

      // 2. O'ZLASHTIRISH VA UY VAZIFA
      const finalY1 = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setTextColor(47, 85, 151);
      doc.text('O\'zlashtirish va Uy Vazifa', 14, finalY1);

      const { data: scoresRecords } = await supabase
        .from('scores')
        .select('student_id, subject_id, score_avg')
        .in('student_id', studentIds)
        .eq('week_start', weekStart);

      const { data: homeworkRecords } = await supabase
        .from('homework')
        .select('student_id, percent_avg')
        .in('student_id', studentIds)
        .eq('week_start', weekStart);

      const scoresTableData = students.map(student => {
        const mathScore = scoresRecords?.find(r => r.student_id === student.id && r.subject_id === 1);
        const engScore = scoresRecords?.find(r => r.student_id === student.id && r.subject_id === 2);
        const hwScore = homeworkRecords?.find(r => r.student_id === student.id);

        return [
          student.full_name,
          mathScore ? `${mathScore.score_avg}%` : '-',
          engScore ? `${engScore.score_avg}%` : '-',
          hwScore ? `${hwScore.percent_avg}%` : '-'
        ];
      });

      autoTable(doc, {
        startY: finalY1 + 5,
        head: [['O\'quvchi', 'Math', 'English', 'Uy vazifa']],
        body: scoresTableData,
        theme: 'striped',
        headStyles: { fillColor: [46, 158, 91], textColor: 255 },
        styles: { fontSize: 9 }
      });

      // 3. HAFTALIK MAVZULAR
      const finalY2 = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setTextColor(47, 85, 151);
      doc.text('Haftalik Mavzular', 14, finalY2);

      const { data: topicsRecords } = await supabase
        .from('weekly_topics')
        .select('*, subjects(name)')
        .eq('group_id', Number(selectedGroupId))
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date');

      const topicsTableData = topicsRecords?.map(record => {
        const recordDate = new Date(record.date);
        const dayIndex = Math.floor((recordDate.getTime() - new Date(weekStart).getTime()) / (24 * 60 * 60 * 1000));
        const dayName = WEEK_DAYS[dayIndex]?.label || '';
        return [
          dayName,
          record.subjects?.name || '-',
          record.covered_topic || '-',
          record.next_topic || '-'
        ];
      }) || [];

      autoTable(doc, {
        startY: finalY2 + 5,
        head: [['Kun', 'Fan', 'O\'tilgan mavzu', 'Keyingi mavzu']],
        body: topicsTableData,
        theme: 'grid',
        headStyles: { fillColor: [240, 162, 2], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 65 },
          3: { cellWidth: 65 }
        }
      });

      doc.save(`hisobot_${selectedGroup?.name}_${formatDate(weekStart)}.pdf`);
    } catch (error) {
      console.error('PDF yaratishda xatolik:', error);
      alert('PDF yaratishda xatolik yuz berdi!');
    }
    setLoading(false);
  };

  // Excel hisobot yaratish
  const generateExcel = async () => {
    if (!selectedGroupId) {
      alert('Guruhni tanlang!');
      return;
    }
    setLoading(true);

    try {
      const selectedGroup = groups.find(g => g.id === Number(selectedGroupId));
      const wb = XLSX.utils.book_new();

      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('group_id', Number(selectedGroupId))
        .eq('is_active', true);

      if (!students || students.length === 0) {
        alert('Bu guruhda o\'quvchilar yo\'q!');
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);
      const weekEnd = new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1. DAVOMAT varaqasi
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('student_id, date, status')
        .in('student_id', studentIds)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      const attendanceData = students.map(student => {
        const row: any = { 'O\'quvchi': student.full_name };
        WEEK_DAYS.forEach((day, index) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + index);
          const dateStr = date.toISOString().split('T')[0];
          const record = attendanceRecords?.find(r => r.student_id === student.id && r.date === dateStr);
          row[day.label] = record?.status || '-';
        });
        return row;
      });

      const ws1 = XLSX.utils.json_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Davomat');

      // 2. O'ZLASHTIRISH varaqasi
      const { data: scoresRecords } = await supabase
        .from('scores')
        .select('student_id, subject_id, score_avg')
        .in('student_id', studentIds)
        .eq('week_start', weekStart);

      const { data: homeworkRecords } = await supabase
        .from('homework')
        .select('student_id, percent_avg')
        .in('student_id', studentIds)
        .eq('week_start', weekStart);

      const scoresData = students.map(student => {
        const mathScore = scoresRecords?.find(r => r.student_id === student.id && r.subject_id === 1);
        const engScore = scoresRecords?.find(r => r.student_id === student.id && r.subject_id === 2);
        const hwScore = homeworkRecords?.find(r => r.student_id === student.id);

        return {
          'O\'quvchi': student.full_name,
          'Math': mathScore ? `${mathScore.score_avg}%` : '-',
          'English': engScore ? `${engScore.score_avg}%` : '-',
          'Uy vazifa': hwScore ? `${hwScore.percent_avg}%` : '-'
        };
      });

      const ws2 = XLSX.utils.json_to_sheet(scoresData);
      XLSX.utils.book_append_sheet(wb, ws2, 'O\'zlashtirish');

      // 3. MAVZULAR varaqasi
      const { data: topicsRecords } = await supabase
        .from('weekly_topics')
        .select('*, subjects(name)')
        .eq('group_id', Number(selectedGroupId))
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date');

      const topicsData = topicsRecords?.map(record => {
        const recordDate = new Date(record.date);
        const dayIndex = Math.floor((recordDate.getTime() - new Date(weekStart).getTime()) / (24 * 60 * 60 * 1000));
        const dayName = WEEK_DAYS[dayIndex]?.label || '';
        return {
          'Kun': dayName,
          'Sana': formatDate(record.date),
          'Fan': record.subjects?.name || '-',
          'O\'tilgan mavzu': record.covered_topic || '-',
          'Keyingi mavzu': record.next_topic || '-'
        };
      }) || [];

      const ws3 = XLSX.utils.json_to_sheet(topicsData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Mavzular');

      XLSX.writeFile(wb, `hisobot_${selectedGroup?.name}_${formatDate(weekStart)}.xlsx`);
    } catch (error) {
      console.error('Excel yaratishda xatolik:', error);
      alert('Excel yaratishda xatolik yuz berdi!');
    }
    setLoading(false);
  };

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="text-textMuted hover:text-primary flex items-center gap-1"
          >
            ← Bosh sahifa
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Hisobotlar</h1>
        </div>
        
        <button 
          onClick={signOut}
          className="bg-danger text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Chiqish
        </button>
      </div>

      {/* Filtrlar */}
      <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">Guruh</label>
            <select 
              value={selectedGroupId} 
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary bg-white min-h-[44px]"
            >
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-textMain mb-2">Hafta boshlanishi</label>
            <input 
              type="date" 
              value={weekStart}
              onChange={(e) => setWeekStart(getMonday(new Date(e.target.value)))}
              className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary bg-white min-h-[44px]"
            />
          </div>

          <div className="flex items-end gap-2">
            <button 
              onClick={generatePDF}
              disabled={loading}
              className="flex-1 bg-danger text-white px-4 py-3 rounded-card font-medium hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
            >
              PDF yuklash
            </button>
            <button 
              onClick={generateExcel}
              disabled={loading}
              className="flex-1 bg-success text-white px-4 py-3 rounded-card font-medium hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
            >
              Excel yuklash
            </button>
          </div>
        </div>
      </div>

      {/* Hisobot tarkibi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100 border-l-4 border-l-primary">
          <h3 className="font-bold text-textMain mb-2">Davomat</h3>
          <p className="text-sm text-textMuted">Haftalik davomat jadvali va foizlar</p>
        </div>
        <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100 border-l-4 border-l-success">
          <h3 className="font-bold text-textMain mb-2">O'zlashtirish</h3>
          <p className="text-sm text-textMuted">Math, English va uy vazifa foizlari</p>
        </div>
        <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100 border-l-4 border-l-warning">
          <h3 className="font-bold text-textMain mb-2">Mavzular</h3>
          <p className="text-sm text-textMuted">Haftalik o'tilgan va keyingi mavzular</p>
        </div>
      </div>

      {/* Hisobot ma'lumotlari */}
      <div className="bg-surface p-6 rounded-card shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-secondary mb-4">Hisobot ma'lumotlari</h2>
        <p className="text-textMuted">
          Guruh: <span className="font-medium text-textMain">{groups.find(g => g.id === Number(selectedGroupId))?.name || 'Tanlanmagan'}</span>
        </p>
        <p className="text-textMuted mt-2">
          Davr: <span className="font-medium text-textMain">{formatDate(weekStart)} - {formatDate(new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}</span>
        </p>
      </div>
    </main>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-primary">Yuklanmoqda...</div>}>
      <ReportsContent />
    </Suspense>
  );
}