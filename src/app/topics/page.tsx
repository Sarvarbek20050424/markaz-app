'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Group } from '@/types';
import { getMonday, formatDate, WEEK_DAYS } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';

function TopicsContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdParam = searchParams.get('groupId');

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(groupIdParam || '');
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  
  // topicsData formati: { "dayIndex_subjectId": { covered: string, next: string } }
  const [topicsData, setTopicsData] = useState<Record<string, { covered: string; next: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const { data: topicsRecords } = await supabase
      .from('weekly_topics')
      .select('*')
      .eq('group_id', Number(selectedGroupId))
      .gte('date', weekStart)
      .lt('date', new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const formattedTopics: Record<string, { covered: string; next: string }> = {};
    if (topicsRecords) {
      topicsRecords.forEach((record: any) => {
        const recordDate = new Date(record.date);
        const startDate = new Date(weekStart);
        const dayIndex = Math.floor((recordDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const key = `${dayIndex}_${record.subject_id}`;
        formattedTopics[key] = {
          covered: record.covered_topic || '',
          next: record.next_topic || ''
        };
      });
    }
    setTopicsData(formattedTopics);
    setLoading(false);
  };

  const updateTopic = (dayIndex: number, subjectId: number, field: 'covered' | 'next', value: string) => {
    const key = `${dayIndex}_${subjectId}`;
    const current = topicsData[key] || { covered: '', next: '' };
    setTopicsData(prev => ({ ...prev, [key]: { ...current, [field]: value } }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const topicsToSave = Object.entries(topicsData)
      .filter(([_, data]) => data.covered || data.next)
      .map(([key, data]) => {
        const [dayIndexStr, subjectIdStr] = key.split('_');
        const dayIndex = parseInt(dayIndexStr);
        const topicDate = new Date(weekStart);
        topicDate.setDate(topicDate.getDate() + dayIndex);

        return {
          group_id: Number(selectedGroupId),
          subject_id: Number(subjectIdStr),
          date: topicDate.toISOString().split('T')[0],
          covered_topic: data.covered,
          next_topic: data.next
        };
      });

    if (topicsToSave.length > 0) {
      // Avval eski ma'lumotlarni o'chirish
      const { error: deleteError } = await supabase
        .from('weekly_topics')
        .delete()
        .eq('group_id', Number(selectedGroupId))
        .gte('date', weekStart)
        .lt('date', new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (deleteError) {
        alert('Eski ma\'lumotlarni o\'chirishda xatolik: ' + deleteError.message);
        setSaving(false);
        return;
      }

      // Yangi ma'lumotlarni qo'shish
      const { error: insertError } = await supabase
        .from('weekly_topics')
        .insert(topicsToSave);

      if (insertError) {
        alert('Mavzularni saqlashda xatolik: ' + insertError.message);
        setSaving(false);
        return;
      }
    }

    alert('Mavzular muvaffaqiyatli saqlandi! ✅');
    fetchData();
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
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Haftalik mavzular</h1>
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
          <p className="text-sm opacity-90">Hafta</p>
          <p className="text-xl md:text-2xl font-bold">{formatDate(weekStart)} - {formatDate(new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}</p>
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

      {/* Mavzular jadvali */}
      <div className="bg-surface rounded-card shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-background border-b border-gray-200">
            <tr>
              <th className="p-4 text-textMuted font-medium">Kun</th>
              <th className="p-4 text-textMuted font-medium">Fan</th>
              <th className="p-4 text-textMuted font-medium">O'tilgan mavzu</th>
              <th className="p-4 text-textMuted font-medium">Keyingi mavzu</th>
            </tr>
          </thead>
          <tbody>
            {WEEK_DAYS.map((day, dayIndex) => 
              subjects.map(subject => {
                const key = `${dayIndex}_${subject.id}`;
                const topic = topicsData[key] || { covered: '', next: '' };
                
                return (
                  <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-background/50">
                    <td className="p-4 font-medium text-textMain">
                      {day.label}
                      <div className="text-xs text-textMuted">{formatDate(new Date(new Date(weekStart).getTime() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}</div>
                    </td>
                    <td className="p-4 text-textMain font-medium">{subject.name}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={topic.covered}
                        onChange={(e) => updateTopic(dayIndex, subject.id, 'covered', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Bu hafta o'tilgan mavzu..."
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={topic.next}
                        onChange={(e) => updateTopic(dayIndex, subject.id, 'next', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Keyingi hafta mavzusi..."
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function TopicsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-primary">Yuklanmoqda...</div>}>
      <TopicsContent />
    </Suspense>
  );
}