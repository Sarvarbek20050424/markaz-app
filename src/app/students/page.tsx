'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Student, Group } from '@/types';
import { useSearchParams, useRouter } from 'next/navigation';

function StudentsContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdParam = searchParams.get('groupId');

  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(groupIdParam || '');
  
  // Tahrirlash uchun
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState('');

  useEffect(() => {
    if (user) {
      fetchGroups();
      if (groupIdParam) fetchStudents(Number(groupIdParam));
    }
  }, [user, groupIdParam]);

  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('*').eq('teacher_id', user?.id);
    if (data) {
      setGroups(data);
      if (!groupIdParam && data.length > 0) setSelectedGroupId(String(data[0].id));
    }
  };

  const fetchStudents = async (groupId: number) => {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*, groups(name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    
    if (data) setStudents(data);
    setLoading(false);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !selectedGroupId) return;

    const { error } = await supabase.from('students').insert({
      full_name: newStudentName.trim(),
      group_id: Number(selectedGroupId),
      is_active: true,
    });

    if (!error) {
      setNewStudentName('');
      fetchStudents(Number(selectedGroupId));
    } else {
      alert('Xatolik: ' + error.message);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editStudentName.trim()) return;

    const { error } = await supabase
      .from('students')
      .update({ full_name: editStudentName.trim() })
      .eq('id', editingStudent.id);

    if (!error) {
      setEditingStudent(null);
      setEditStudentName('');
      fetchStudents(Number(selectedGroupId));
    } else {
      alert('Tahrirlashda xatolik: ' + error.message);
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setEditStudentName(student.full_name);
  };

  const toggleActive = async (studentId: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('students')
      .update({ is_active: !currentStatus })
      .eq('id', studentId);

    if (!error) {
      fetchStudents(Number(selectedGroupId));
    }
  };

  if (loading) return <div className="p-8 text-center text-primary">Yuklanmoqda...</div>;

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/groups')} className="text-textMuted hover:text-primary flex items-center gap-1">
            ← Guruhlarga qaytish
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">O'quvchilarni boshqarish</h1>
        </div>
        <button 
          onClick={signOut}
          className="bg-danger text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Chiqish
        </button>
      </div>

      {/* Qo'shish formasi */}
      <div className="bg-surface p-6 rounded-card shadow-sm mb-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-secondary mb-4">Yangi o'quvchi qo'shish</h2>
        <form onSubmit={handleAddStudent} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="O'quvchining F.I.O"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            required
          />
          <select 
            value={selectedGroupId} 
            onChange={(e) => { setSelectedGroupId(e.target.value); fetchStudents(Number(e.target.value)); }}
            className="md:w-48 px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] bg-white"
          >
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button type="submit" className="bg-success text-white px-6 py-3 rounded-card font-medium min-h-[44px] hover:bg-success/90 transition-colors">
            Qo'shish
          </button>
        </form>
      </div>

      {/* Tahrirlash modali */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-card shadow-xl max-w-md w-full">
            <h2 className="text-lg font-semibold text-secondary mb-4">O'quvchi ismini tahrirlash</h2>
            <form onSubmit={handleEditStudent}>
              <input
                type="text"
                value={editStudentName}
                onChange={(e) => setEditStudentName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setEditStudentName('');
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-textMain px-6 py-3 rounded-card font-medium min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  className="bg-primary hover:bg-secondary text-white px-6 py-3 rounded-card font-medium min-h-[44px]"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ro'yxat */}
      <div className="bg-surface rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-background">
          <h3 className="font-semibold text-secondary">
            {groups.find(g => g.id === Number(selectedGroupId))?.name || 'Guruh'} - O'quvchilar
          </h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-background border-b border-gray-200">
            <tr>
              <th className="p-4 text-textMuted font-medium">№</th>
              <th className="p-4 text-textMuted font-medium">F.I.O</th>
              <th className="p-4 text-textMuted font-medium hidden md:table-cell">Guruh</th>
              <th className="p-4 text-textMuted font-medium text-right">Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-textMuted">Bu guruhda o'quvchilar yo'q.</td></tr>
            ) : (
              students.map((student, index) => (
                <tr key={student.id} className="border-b border-gray-100 last:border-0 hover:bg-background/50">
                  <td className="p-4 text-textMuted">{index + 1}</td>
                  <td className="p-4 font-medium text-textMain">{student.full_name}</td>
                  <td className="p-4 text-textMuted hidden md:table-cell">{student.groups?.name}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => startEdit(student)}
                        className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 rounded-card text-sm font-medium min-h-[44px] transition-colors"
                        title="Tahrirlash"
                      >
                        ✏️ Tahrirlash
                      </button>
                      <button
                        onClick={() => toggleActive(student.id, student.is_active)}
                        className={`px-3 py-2 rounded-card text-sm font-medium min-h-[44px] transition-colors ${
                          student.is_active 
                            ? 'bg-warning/10 text-warning hover:bg-warning/20' 
                            : 'bg-success/10 text-success hover:bg-success/20'
                        }`}
                      >
                        {student.is_active ? '📦 Arxivlash' : '♻️ Tiklash'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-primary">Yuklanmoqda...</div>}>
      <StudentsContent />
    </Suspense>
  );
}