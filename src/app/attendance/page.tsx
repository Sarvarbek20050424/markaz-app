'use client';

'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Student, Group } from '@/types';
import { getMonday, formatDate, WEEK_DAYS } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function AttendanceContent() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const groupIdParam = searchParams.get('groupId');

    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState(groupIdParam || '');
    const [weekStart, setWeekStart] = useState(getMonday(new Date()));

    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Bugungi sana
    const today = new Date().toISOString().split('T')[0];
    const todayDayIndex = new Date().getDay(); // 0=Yakshanba, 1=Dushanba, ...
    const todayWeekDay = todayDayIndex === 0 ? 6 : todayDayIndex - 1; // 0=Dushanba, 1=Seshanba, ...
    const todayWeekDayName = WEEK_DAYS[todayWeekDay]?.label || 'Noma\'lum';

    // Guruhlarni yuklash
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

    // O'quvchilar va davomatni yuklash
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

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 4);

            const { data: attendanceRecords } = await supabase
                .from('attendance')
                .select('student_id, date, status')
                .in('student_id', studentIds)
                .gte('date', weekStart)
                .lte('date', weekEnd.toISOString().split('T')[0]);

            const formattedData: Record<string, string> = {};
            if (attendanceRecords) {
                attendanceRecords.forEach((record: any) => {
                    formattedData[`${record.student_id}_${record.date}`] = record.status;
                });
            }
            setAttendanceData(formattedData);
        }
        setLoading(false);
    };

    const setStatus = (studentId: number, date: string, status: string) => {
        // Faqat bugungi kun yoki o'tgan kunlarni tahrirlash mumkin
        if (date > today) {
            alert('Kelajak sanalarni o\'zgartirib bo\'lmaydi!');
            return;
        }

        setAttendanceData(prev => {
            const newData = { ...prev };
            if (status === '') {
                delete newData[`${studentId}_${date}`];
            } else {
                newData[`${studentId}_${date}`] = status;
            }
            return newData;
        });
    };

    const markAllPresent = () => {
        const newData = { ...attendanceData };
        students.forEach(student => {
            // Faqat bugungi kun yoki o'tgan kunlarni belgilash
            const currentDate = getDateForDay(todayWeekDay, weekStart);
            if (currentDate <= today) {
                newData[`${student.id}_${currentDate}`] = 'keldi';
            }
        });
        setAttendanceData(newData);
    };

    const getDateForDay = (dayIndex: number, startWeek: string) => {
        const start = new Date(startWeek);
        const targetDate = new Date(start);
        targetDate.setDate(start.getDate() + dayIndex);
        return targetDate.toISOString().split('T')[0];
    };

   const handleSave = async () => {
  if (!user) return;
  setSaving(true);
  
  const recordsToSave = Object.entries(attendanceData)
    .filter(([key, status]) => {
      const date = key.split('_')[1];
      return status !== '' && status !== undefined && date <= today;
    })
    .map(([key, status]) => {
      const [studentIdStr, date] = key.split('_');
      return {
        student_id: Number(studentIdStr),
        date: date,
        status: status,
        marked_by: user.id
      };
    });

  if (recordsToSave.length === 0) {
    alert('Saqlash uchun ma\'lumot yo\'q');
    setSaving(false);
    return;
  }

  const { error } = await supabase
    .from('attendance')
    .upsert(recordsToSave, { onConflict: 'student_id,date' });

  if (error) {
    alert('Xatolik yuz berdi: ' + error.message);
    setSaving(false);
  } else {
    alert('Davomat saqlandi! PDF hisobot yaratilmoqda...');
    await fetchData();
    // PDF hisobot yaratish
    generatePDFReport();
  }
  setSaving(false);
};
const generatePDFReport = () => {
  try {
    const doc = new jsPDF();
    const selectedGroup = groups.find(g => g.id === Number(selectedGroupId));
    
    // Sarlavha
    doc.setFontSize(18);
    doc.setTextColor(47, 85, 151);
    doc.text('Davomat Hisoboti', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Guruh: ${selectedGroup?.name || 'Noma\'lum'}`, 14, 30);
    doc.text(`Hafta: ${formatDate(weekStart)} - ${formatDate(getDateForDay(4, weekStart))}`, 14, 36);
    doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 42);
    
    // Davomat jadvali
    const tableData = students.map(student => {
      const row: any[] = [student.full_name];
      WEEK_DAYS.forEach((day, index) => {
        const date = getDateForDay(index, weekStart);
        const status = attendanceData[`${student.id}_${date}`] || '-';
        row.push(status === 'keldi' ? '+' : status === 'kelmadi' ? 'X' : status);
      });
      return row;
    });

    autoTable(doc, {
      startY: 50,
      head: [['O\'quvchi', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [47, 85, 151], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      }
    });

    // Statistika
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(47, 85, 151);
    doc.text('Statistika', 14, finalY);
    
    const statsData = students.map(student => {
      let present = 0;
      let total = 0;
      WEEK_DAYS.forEach((day, index) => {
        const date = getDateForDay(index, weekStart);
        const status = attendanceData[`${student.id}_${date}`];
        if (status) {
          total++;
          if (status === 'keldi') present++;
        }
      });
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return [student.full_name, `${percentage}%`];
    });

    autoTable(doc, {
      startY: finalY + 5,
      head: [['O\'quvchi', 'Davomat %']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [46, 158, 91], textColor: 255 },
      styles: { fontSize: 9 }
    });

    // PDF ni yuklab olish
    doc.save(`davomat_${selectedGroup?.name}_${formatDate(weekStart)}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF yaratishda xatolik:', error);
    return false;
  }
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
                    <h1 className="text-2xl md:text-3xl font-bold text-secondary">Davomat</h1>
                </div>

                <button
                    onClick={signOut}
                    className="bg-danger text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity min-h-[44px]"
                >
                    Chiqish
                </button>
            </div>

            {/* Bugungi sana va hafta kuni */}
            <div className="bg-primary text-white p-4 rounded-card mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <p className="text-sm opacity-90">Bugungi sana</p>
                    <p className="text-xl md:text-2xl font-bold">{formatDate(today)} - {todayWeekDayName}</p>
                </div>
                <div className="text-sm opacity-90">
                    Hafta: {formatDate(weekStart)} dan {formatDate(getDateForDay(4, weekStart))} gacha
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
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={markAllPresent}
                        className="bg-success/10 text-success px-4 py-2 rounded-card text-sm font-medium hover:bg-success/20 transition-colors min-h-[44px] flex items-center gap-2"
                    >
                        ✅ Bugun hammasi keldi
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary text-white px-6 py-2 rounded-card text-sm font-medium hover:bg-secondary transition-colors min-h-[44px] disabled:opacity-50"
                    >
                        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                </div>
            </div>

            {students.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-card border border-gray-200">
                    <p className="text-textMuted">Bu guruhda faol o'quvchilar yo'q.</p>
                </div>
            ) : (
                <>
                    {/* Haftalik jadval - faqat bugungi kun tahrirlash mumkin */}
                    <div className="bg-surface rounded-card shadow-sm border border-gray-100 overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-background border-b border-gray-200">
                                <tr>
                                    <th className="p-4 text-textMuted font-medium sticky left-0 bg-background z-10">O'quvchi</th>
                                    {WEEK_DAYS.map((day, index) => {
                                        const date = getDateForDay(index, weekStart);
                                        const isToday = date === today;
                                        const isPast = date < today;
                                        const isFuture = date > today;

                                        return (
                                            <th
                                                key={day.key}
                                                className={`p-4 text-center w-32 ${isToday ? 'bg-primary/10 text-primary' :
                                                        isPast ? 'text-textMuted' :
                                                            'text-gray-300'
                                                    }`}
                                            >
                                                <div className="font-medium">{day.label}</div>
                                                <div className="text-xs">{formatDate(date)}</div>
                                                {isToday && <div className="text-xs mt-1">📍 Bugun</div>}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id} className="border-b border-gray-100 last:border-0 hover:bg-background/50">
                                        <td className="p-4 font-medium text-textMain sticky left-0 bg-surface z-10">
                                            {student.full_name}
                                        </td>
                                        {WEEK_DAYS.map((day, index) => {
                                            const date = getDateForDay(index, weekStart);
                                            const status = attendanceData[`${student.id}_${date}`] || '';
                                            const isToday = date === today;
                                            const isPast = date < today;
                                            const isFuture = date > today;

                                            return (
                                                <td key={day.key} className="p-2 text-center">
                                                    {isFuture ? (
                                                        // Kelajak - faqat ko'rish (bo'sh)
                                                        <div className="text-gray-300 text-xs py-2">—</div>
                                                    ) : isToday ? (
                                                        // Bugun - tahrirlash mumkin
                                                        <StatusButtons
                                                            status={status}
                                                            onChange={(newStatus) => setStatus(student.id, date, newStatus)}
                                                        />
                                                    ) : (
                                                        // O'tgan kunlar - faqat ko'rish
                                                        <StatusDisplay status={status} />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobil ko'rinish */}
                    <div className="md:hidden mt-6 space-y-4">
                        <MobileDailyView
                            students={students}
                            weekStart={weekStart}
                            attendanceData={attendanceData}
                            setStatus={setStatus}
                            today={today}
                            todayWeekDay={todayWeekDay}
                        />
                    </div>
                </>
            )}
        </main>
    );
}

// Status tugmalari (tahrirlash mumkin)
function StatusButtons({ status, onChange }: { status: string, onChange: (s: string) => void }) {
    return (
        <div className="flex flex-col gap-1">
            <button
                onClick={() => onChange(status === 'keldi' ? '' : 'keldi')}
                className={`w-full py-1 rounded text-xs font-bold transition-all min-h-[36px] ${status === 'keldi'
                        ? 'bg-success text-white ring-2 ring-success/50'
                        : 'bg-success/60 text-white opacity-60 hover:opacity-100'
                    }`}
            >
                +
            </button>
            <button
                onClick={() => onChange(status === 'kelmadi' ? '' : 'kelmadi')}
                className={`w-full py-1 rounded text-xs font-bold transition-all min-h-[36px] ${status === 'kelmadi'
                        ? 'bg-danger text-white ring-2 ring-danger/50'
                        : 'bg-danger/60 text-white opacity-60 hover:opacity-100'
                    }`}
            >
                X
            </button>
            <select
                value={status === 'kechikdi' || status === 'sababli' ? status : ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded py-1 text-center focus:outline-none focus:ring-1 focus:ring-primary min-h-[32px]"
            >
                <option value="">Holat...</option>
                <option value="kechikdi">Kechikdi</option>
                <option value="sababli">Sababli</option>
            </select>
        </div>
    );
}

// Status ko'rsatish (faqat o'qish)
function StatusDisplay({ status }: { status: string }) {
    if (!status) return <div className="text-gray-300 text-xs">—</div>;

    const getColor = (s: string) => {
        if (s === 'keldi') return 'bg-success/20 text-success';
        if (s === 'kelmadi') return 'bg-danger/20 text-danger';
        if (s === 'kechikdi') return 'bg-warning/20 text-warning';
        if (s === 'sababli') return 'bg-blue-500/20 text-blue-500';
        return 'bg-gray-100 text-gray-400';
    };

    const getSymbol = (s: string) => {
        if (s === 'keldi') return '+';
        if (s === 'kelmadi') return 'X';
        if (s === 'kechikdi') return '';
        if (s === 'sababli') return '📝';
        return '';
    };

    return (
        <div className={`py-2 px-3 rounded text-xs font-bold ${getColor(status)}`}>
            {getSymbol(status)} {status}
        </div>
    );
}

// Mobil ko'rinish
function MobileDailyView({ students, weekStart, attendanceData, setStatus, today, todayWeekDay }: any) {
    const getDateForDay = (dayIndex: number, startWeek: string) => {
        const start = new Date(startWeek);
        const targetDate = new Date(start);
        targetDate.setDate(start.getDate() + dayIndex);
        return targetDate.toISOString().split('T')[0];
    };

    const currentDate = getDateForDay(todayWeekDay, weekStart);
    const currentDay = WEEK_DAYS[todayWeekDay];

    return (
        <div>
            <div className="bg-primary/10 p-4 rounded-card mb-4">
                <p className="text-sm text-textMuted">Bugungi kun</p>
                <p className="text-xl font-bold text-primary">{currentDay.label} - {formatDate(currentDate)}</p>
            </div>

            <div className="space-y-3">
                {students.map((student: Student) => {
                    const status = attendanceData[`${student.id}_${currentDate}`] || '';
                    return (
                        <div key={student.id} className="bg-surface p-4 rounded-card shadow-sm border border-gray-100">
                            <p className="font-semibold text-textMain mb-3">{student.full_name}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setStatus(student.id, currentDate, status === 'keldi' ? '' : 'keldi')}
                                    className={`py-3 rounded-card font-bold text-sm transition-all min-h-[44px] ${status === 'keldi' ? 'bg-success text-white shadow-sm' : 'bg-gray-100 text-textMuted hover:bg-gray-200'
                                        }`}
                                >
                                    + Keldi
                                </button>
                                <button
                                    onClick={() => setStatus(student.id, currentDate, status === 'kelmadi' ? '' : 'kelmadi')}
                                    className={`py-3 rounded-card font-bold text-sm transition-all min-h-[44px] ${status === 'kelmadi' ? 'bg-danger text-white shadow-sm' : 'bg-gray-100 text-textMuted hover:bg-gray-200'
                                        }`}
                                >
                                    X Kelmadi
                                </button>
                                <select
                                    value={status === 'kechikdi' || status === 'sababli' ? status : ''}
                                    onChange={(e) => setStatus(student.id, currentDate, e.target.value)}
                                    className="col-span-2 py-3 px-3 rounded-card border border-gray-200 text-sm text-textMain focus:outline-none focus:ring-2 focus:ring-primary bg-white min-h-[44px]"
                                >
                                    <option value="">Qo'shimcha holat...</option>
                                    <option value="kechikdi">⚠️ Kechikdi</option>
                                    <option value="sababli"> Sababli</option>
                                </select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function AttendancePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-primary">Yuklanmoqda...</div>}>
            <AttendanceContent />
        </Suspense>
    );
}