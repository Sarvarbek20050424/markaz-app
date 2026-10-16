'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Student, Group } from '@/types';
import { getMonday, formatDate } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function ScoresContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdParam = searchParams.get('groupId');

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(groupIdParam || '');
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  
  const [students, setStudents] = useState<Student[]>([]);
  const [scoresData, setScoresData] = useState<Record<string, { min: string; max: string; avg: string }>>({});
  const [homeworkData, setHomeworkData] = useState<Record<string, { min: string; max: string; avg: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayWeekDayName = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'][new Date().getDay()];

  const subjects = [
    { id: 1, name: 'Math' },
    { id: 2, name: 'English' }
  ];

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('*').eq('teacher_id', user?.id);
    if (data) {
      setGroups(data);
      if (!groupIdParam && data.length > 0) setSelectedGroupId(String(data[0].id));
    }
  };

  useEffect(() => {
    if (selectedGroupId && weekStart) fetchData();
  }, [selectedGroupId, weekStart]);

  const fetchData = async () => {
    setLoading(true);
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .eq('group_id', Number(selectedGroupId))
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (studentsData) setStudents(studentsData);

    if (studentsData && studentsData.length > 0) {
      const studentIds = studentsData.map(s => s.id);
      
      const { data: scoresRecords } = await supabase
        .from('scores')
        .select('*')
        .in('student_id', studentIds)
        .eq('week_start', weekStart);

      const formattedScores: Record<string, { min: string; max: string; avg: string }> = {};
      if (scoresRecords) {
        scoresRecords.forEach((record: any) => {
          formattedScores[`${record.student_id}_${record.subject_id}`] = {
            min: record.score_min?.toString() || '',
            max: record.score_max?.toString() || '',
            avg: record.score_avg?.toString() || ''
          };
        });
      }
      setScoresData(formattedScores);

      const { data: homeworkRecords } = await supabase
        .from('homework')
        .select('*')
        .in('student_id', studentIds)
        .eq('week_start', weekStart);

      const formattedHomework: Record<string, { min: string; max: string; avg: string }> = {};
      if (homeworkRecords) {
        homeworkRecords.forEach((record: any) => {
          formattedHomework[`${record.student_id}`] = {
            min: record.percent_min?.toString() || '',
            max: record.percent_max?.toString() || '',
            avg: record.percent_avg?.toString() || ''
          };
        });
      }
      setHomeworkData(formattedHomework);
    }
    setLoading(false);
  };

  const calculateAvg = (min: string, max: string): string => {
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);
    if (!isNaN(minNum) && !isNaN(maxNum)) {
      return ((minNum + maxNum) / 2).toFixed(1);
    }
    return '';
  };

  const updateScore = (studentId: number, subjectId: number, field: 'min' | 'max', value: string) => {
    const key = `${studentId}_${subjectId}`;
    const current = scoresData[key] || { min: '', max: '', avg: '' };
    const updated = { ...current, [field]: value };
    updated.avg = calculateAvg(updated.min, updated.max);
    setScoresData(prev => ({ ...prev, [key]: updated }));
  };

  const updateHomework = (studentId: number, field: 'min' | 'max', value: string) => {
    const key = `${studentId}`;
    const current = homeworkData[key] || { min: '', max: '', avg: '' };
    const updated = { ...current, [field]: value };
    updated.avg = calculateAvg(updated.min, updated.max);
    setHomeworkData(prev => ({ ...prev, [key]: updated }));
  };

  // PDF hisobot yaratish funksiyasi
  const generatePDFReport = () => {
    try {
      const doc = new jsPDF();
      const selectedGroup = groups.find(g => g.id === Number(selectedGroupId));
      const weekEnd = new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Sarlavha
      doc.setFontSize(18);
      doc.setTextColor(47, 85, 151); // #2F5597
      doc.text("O'zlashtirish va Uy Vazifa Hisoboti", 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Guruh: ${selectedGroup?.name || "Noma'lum"}`, 14, 30);
      doc.text(`Hafta: ${formatDate(weekStart)} - ${formatDate(weekEnd)}`, 14, 36);
      doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 42);
      
      // O'zlashtirish jadvali
      const tableData = students.map(student => {
        const mathKey = `${student.id}_1`;
        const engKey = `${student.id}_2`;
        const hwKey = `${student.id}`;
        
        const mathData = scoresData[mathKey] || { min: '', max: '', avg: '' };
        const engData = scoresData[engKey] || { min: '', max: '', avg: '' };
        const hwData = homeworkData[hwKey] || { min: '', max: '', avg: '' };

        const formatRange = (data: { min: string; max: string; avg: string }) => {
          if (data.min && data.max && data.min !== data.max) {
            return `${data.min}-${data.max}%`;
          }
          return data.avg ? `${data.avg}%` : '-';
        };

        return [
          student.full_name,
          formatRange(mathData),
          mathData.avg || '-',
          formatRange(engData),
          engData.avg || '-',
          formatRange(hwData),
          hwData.avg || '-'
        ];
      });

      autoTable(doc, {
        startY: 50,
        head: [["O'quvchi", 'Math (dan-gacha)', "Math o'rtacha", 'English (dan-gacha)', "English o'rtacha", 'Uy vazifa (dan-gacha)', "Uy vazifa o'rtacha"]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [47, 85, 151], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
          6: { cellWidth: 20, halign: 'center' }
        }
      });

      // Statistika qismi
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setTextColor(47, 85, 151);
      doc.text('Statistika', 14, finalY);
      
      const statsData = students.map(student => {
        const mathKey = `${student.id}_1`;
        const engKey = `${student.id}_2`;
        const hwKey = `${student.id}`;
        
        const mathAvg = parseFloat(scoresData[mathKey]?.avg || '0');
        const engAvg = parseFloat(scoresData[engKey]?.avg || '0');
        const hwAvg = parseFloat(scoresData[hwKey]?.avg || '0');
        
        const totalAvg = mathAvg && engAvg ? ((mathAvg + engAvg) / 2).toFixed(1) : '-';
        
        return [student.full_name, mathAvg ? `${mathAvg}%` : '-', engAvg ? `${engAvg}%` : '-', hwAvg ? `${hwAvg}%` : '-', totalAvg];
      });

      autoTable(doc, {
        startY: finalY + 5,
        head: [["O'quvchi", 'Math', 'English', 'Uy vazifa', 'Umumiy']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [46, 158, 91], textColor: 255 },
        styles: { fontSize: 9 }
      });

      // PDF ni yuklab olish
      doc.save(`ozlashtirish_${selectedGroup?.name}_${formatDate(weekStart)}.pdf`);
      return true;
    } catch (error) {
      console.error('PDF yaratishda xatolik:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const scoresToSave = Object.entries(scoresData)
      .filter(([_, data]) => data.avg !== '')
      .map(([key, data]) => {
        const [studentIdStr, subjectIdStr] = key.split('_');
        return {
          student_id: Number(studentIdStr),
          subject_id: Number(subjectIdStr),
          week_start: weekStart,
          score_min: data.min ? parseFloat(data.min) : null,
          score_max: data.max ? parseFloat(data.max) : null,
          score_avg: parseFloat(data.avg),
          entered_by: user.id
        };
      });

    if (scoresToSave.length > 0) {
      const { error: scoresError } = await supabase
        .from('scores')
        .upsert(scoresToSave, { onConflict: 'student_id,subject_id,week_start' });
      
      if (scoresError) {
        alert("O'zlashtirish saqlashda xatolik: " + scoresError.message);
        setSaving(false);
        return;
      }
    }

    const homeworkToSave = Object.entries(homeworkData)
      .filter(([_, data]) => data.avg !== '')
      .map(([key, data]) => {
        const studentId = Number(key);
        return {
          student_id: studentId,
          week_start: weekStart,
          percent_min: data.min ? parseFloat(data.min) : null,
          percent_max: data.max ? parseFloat(data.max) : null,
          percent_avg: parseFloat(data.avg),
          entered_by: user.id
        };
      });

    if (homeworkToSave.length > 0) {
      const { error: homeworkError } = await supabase
        .from('homework')
        .upsert(homeworkToSave, { onConflict: 'student_id,week_start' });
      
      if (homeworkError) {
        alert('Uy vazifa saqlashda xatolik: ' + homeworkError.message);
        setSaving(false);
        return;
      }
    }

    alert("Ma'lumotlar muvaffaqiyatli saqlandi! PDF hisobot yaratilmoqda...");
    await fetchData();
    
    // PDF yaratish
    const success = generatePDFReport();
    if (!success) {
      alert('PDF yaratishda xatolik yuz berdi. Console\'ni tekshiring.');
    }
    
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-primary">Yuklanmoqda...</div>;

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
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">O'zlashtirish va Uy vazifa</h1>
        </div>
        
        <button 
          onClick={signOut}
          className="bg-danger text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Chiqish
        </button>
      </div>

      {/* Bugungi sana */}
      <div className="bg-primary text-white p-4 rounded-card mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <p className="text-sm opacity-90">Bugungi sana</p>
          <p className="text-xl md:text-2xl font-bold">{formatDate(today)} - {todayWeekDayName}</p>
        </div>
        <div className="text-sm opacity-90">
          Hafta: {formatDate(weekStart)} dan {formatDate(new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])} gacha
        </div>
      </div>

      {/* Filtrlar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            value={selectedGroupId} 
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary bg-white min-h-[44px]"
          >
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          
          <input 
            type="date" 
            value={weekStart}
            onChange={(e) => setWeekStart(getMonday(new Date(e.target.value)))}
            className="px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary bg-white min-h-[44px]"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-6 py-2 rounded-card text-sm font-medium hover:bg-secondary transition-colors min-h-[44px] disabled:opacity-50"
        >
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-card border border-gray-200">
          <p className="text-textMuted">Bu guruhda faol o'quvchilar yo'q.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-background border-b border-gray-200">
              <tr>
                <th className="p-4 text-textMuted font-medium sticky left-0 bg-background z-10">O'quvchi</th>
                <th className="p-4 text-textMuted font-medium text-center">Math (dan-gacha)</th>
                <th className="p-4 text-textMuted font-medium text-center">Math o'rtacha</th>
                <th className="p-4 text-textMuted font-medium text-center">English (dan-gacha)</th>
                <th className="p-4 text-textMuted font-medium text-center">English o'rtacha</th>
                <th className="p-4 text-textMuted font-medium text-center">Uy vazifa (dan-gacha)</th>
                <th className="p-4 text-textMuted font-medium text-center">Uy vazifa o'rtacha</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const mathKey = `${student.id}_1`;
                const engKey = `${student.id}_2`;
                const hwKey = `${student.id}`;
                
                const mathData = scoresData[mathKey] || { min: '', max: '', avg: '' };
                const engData = scoresData[engKey] || { min: '', max: '', avg: '' };
                const hwData = homeworkData[hwKey] || { min: '', max: '', avg: '' };

                return (
                  <tr key={student.id} className="border-b border-gray-100 last:border-0 hover:bg-background/50">
                    <td className="p-4 font-medium text-textMain sticky left-0 bg-surface z-10">
                      {student.full_name}
                    </td>
                    
                    {/* Math */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={mathData.min}
                          onChange={(e) => updateScore(student.id, 1, 'min', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="0"
                        />
                        <span className="text-textMuted">-</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={mathData.max}
                          onChange={(e) => updateScore(student.id, 1, 'max', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="100"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-primary">
                      {mathData.avg || '-'}
                    </td>
                    
                    {/* English */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={engData.min}
                          onChange={(e) => updateScore(student.id, 2, 'min', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="0"
                        />
                        <span className="text-textMuted">-</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={engData.max}
                          onChange={(e) => updateScore(student.id, 2, 'max', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="100"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-primary">
                      {engData.avg || '-'}
                    </td>
                    
                    {/* Uy vazifa */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={hwData.min}
                          onChange={(e) => updateHomework(student.id, 'min', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="0"
                        />
                        <span className="text-textMuted">-</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={hwData.max}
                          onChange={(e) => updateHomework(student.id, 'max', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="100"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-success">
                      {hwData.avg || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-primary">Yuklanmoqda...</div>}>
      <ScoresContent />
    </Suspense>
  );
}