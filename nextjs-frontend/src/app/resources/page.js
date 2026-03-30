'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import {
  SignOut
} from '@phosphor-icons/react';
import StudyResources from '@/components/StudyResources';
import ChatbotWrapper from '@/components/ChatbotWrapper';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/resources');

export default function ResourcesPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [d, setD] = useState(null);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  useEffect(() => {
    if (user) api.get('/dashboard').then(r => setD(r.data.dashboard)).catch(() => {});
  }, [user]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;

  const handleLogout = () => { logout(); router.push('/login'); };
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const profile = d?.profile || {};

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[200px] bg-white border-r border-gray-100 min-h-screen py-6 px-4 fixed left-0 top-0 z-40">
        <div className="flex items-center gap-2 px-2 mb-10 cursor-pointer" onClick={() => router.push('/dashboard')}>
          <div className="w-3 h-3 rounded-full bg-[#5956DF]" />
          <span className="font-semibold tracking-tight text-[#1A1A1A] text-[15px]">PrepMind <strong className="font-extrabold text-[#5956DF]">AI</strong></span>
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all ${item.active ? 'bg-[#5956DF]/10 text-[#5956DF] font-bold' : 'text-[#6B7280] hover:bg-gray-50 font-medium'}`}>
              <item.icon size={18} weight={item.active ? 'fill' : 'regular'} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C79F2] flex items-center justify-center text-white font-bold text-xs shadow-sm">{firstName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#1A1A1A] truncate">{user?.name}</p><p className="text-[10px] text-[#9CA3AF]">{profile.examName || 'Student'}</p></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[200px]">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
          <div className="flex items-center justify-between px-6 lg:px-8 h-14">
            <div className="flex lg:hidden items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
              <div className="w-3 h-3 rounded-full bg-[#5956DF]" />
              <span className="font-semibold text-[15px]">PrepMind <strong className="text-[#5956DF]">AI</strong></span>
            </div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-200" />
              <button onClick={handleLogout} className="text-[12px] font-medium text-[#9CA3AF] hover:text-red-500"><SignOut size={14} /></button>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-6 w-full">
          <StudyResources />
        </div>
      </div>
      <ChatbotWrapper />
    </div>
  );
}
