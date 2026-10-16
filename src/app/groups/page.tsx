'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Group } from '@/types';
import { useRouter } from 'next/navigation';

export default function GroupsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Tahrirlash uchun
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState('');

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('groups')
      .select('*, profiles(full_name)')
      .eq('teacher_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) setGroups(data);
    setLoading(false);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    const { error } = await supabase.from('groups').insert({
      name: newGroupName.trim(),
      teacher_id: user.id,
    });

    if (!error) {
      setNewGroupName('');
      setIsAdding(false);
      fetchGroups();
    } else {
      alert('Xatolik yuz berdi: ' + error.message);
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editGroupName.trim()) return;

    const { error } = await supabase
      .from('groups')
      .update({ name: editGroupName.trim() })
      .eq('id', editingGroup.id);

    if (!error) {
      setEditingGroup(null);
      setEditGroupName('');
      fetchGroups();
    } else {
      alert('Tahrirlashda xatolik: ' + error.message);
    }
  };

  const startEdit = (group: Group) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
  };

  if (authLoading || loading) {
    return (
      <div className="p-8 text-center text-primary">
        <div className="animate-pulse text-lg">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="text-textMuted hover:text-primary flex items-center gap-1"
          >
            ← Bosh sahifa
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Guruhlarni boshqarish</h1>
        </div>
        
        <div className="flex gap-2">
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-primary hover:bg-secondary text-white px-6 py-3 rounded-card font-medium transition-colors min-h-[44px] flex items-center gap-2 shadow-sm"
            >
              <span className="text-xl">+</span>
              Yangi guruh
            </button>
          )}
          <button 
            onClick={signOut}
            className="bg-danger text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity min-h-[44px]"
          >
            Chiqish
          </button>
        </div>
      </div>

      {/* Guruh qo'shish formasi */}
      {isAdding && (
        <div className="bg-surface p-6 rounded-card shadow-md mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-secondary mb-4">Yangi guruh qo'shish</h2>
          <form onSubmit={handleAddGroup} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Masalan: IELTS A1, Math 9-sinf"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="bg-success hover:bg-success/90 text-white px-6 py-3 rounded-card font-medium min-h-[44px] transition-colors"
              >
                Saqlash
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setNewGroupName('');
                }} 
                className="bg-gray-200 hover:bg-gray-300 text-textMain px-6 py-3 rounded-card font-medium min-h-[44px] transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tahrirlash modali */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-card shadow-xl max-w-md w-full">
            <h2 className="text-lg font-semibold text-secondary mb-4">Guruh nomini tahrirlash</h2>
            <form onSubmit={handleEditGroup}>
              <input
                type="text"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => {
                    setEditingGroup(null);
                    setEditGroupName('');
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

      {/* Guruhlar ro'yxati */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-surface rounded-card border border-gray-200">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-textMuted text-lg mb-2">Hozircha guruhlar yo'q</p>
            <p className="text-textMuted text-sm">Yuqoridagi "+ Yangi guruh" tugmasini bosing</p>
          </div>
        ) : (
          groups.map((group) => (
            <div 
              key={group.id} 
              className="bg-surface p-5 rounded-card shadow-sm border border-gray-200 hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-primary group-hover:text-secondary transition-colors flex-1">
                  {group.name}
                </h3>
                <button
                  onClick={() => startEdit(group)}
                  className="text-textMuted hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  title="Tahrirlash"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-textMuted mb-4">
                O'qituvchi: {group.profiles?.full_name || 'Noma\'lum'}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-textMuted">
                  {new Date(group.created_at).toLocaleDateString('uz-UZ')}
                </span>
                <button 
                  onClick={() => router.push(`/students?groupId=${group.id}`)}
                  className="text-primary text-sm font-medium hover:text-secondary transition-colors"
                >
                  O'quvchilarni ko'rish →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}