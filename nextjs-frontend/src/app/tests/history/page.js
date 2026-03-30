'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Exam, Sparkle, Clock, Target, CalendarBlank, ArrowRight } from '@phosphor-icons/react';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/tests');

export default function CustomTestHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      api.get('/custom-tests/history')
        .then(res => {
          if (res.data.success) {
            setHistory(res.data.history);
          }
        })
        .catch(err => toast.error('Failed to load history'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0F19] hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkle weight="fill" className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-wide">PrepMind</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                item.active
                  ? 'bg-violet-500/10 text-violet-400 font-medium'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <item.icon size={20} weight={item.active ? "fill" : "regular"} />
              {item.label}
            </a>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex justify-between items-end border-b border-white/10 pb-6">
            <div>
              <button 
                onClick={() => router.push('/tests')}
                className="text-violet-400 hover:text-violet-300 font-semibold mb-2 flex items-center gap-2"
              >
                &larr; Back to Generator
              </button>
              <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                Custom Test History
              </h1>
              <p className="text-gray-400 text-lg mt-2">
                Review your past AI-generated practice sessions
              </p>
            </div>
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-gray-300">
              <span className="font-bold text-white">{history.length}</span> Tests Taken
            </div>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
              <Sparkle size={48} className="mx-auto text-gray-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-300">No History Yet</h2>
              <p className="text-gray-500 mt-2">Generate and complete a test to see it here.</p>
              <button 
                onClick={() => router.push('/tests')}
                className="mt-6 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-8 rounded-full transition-all"
              >
                Generate a Test
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {history.map((test) => (
                <div 
                  key={test.test_id} 
                  onClick={() => router.push(`/custom-test/analysis/${test.test_id}`)}
                  className="bg-[#121826] border border-white/10 hover:border-violet-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] shadow-xl group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider rounded-lg">
                        {test.subject}
                      </span>
                      <span className="text-gray-500 text-sm flex items-center gap-1">
                        <CalendarBlank /> {new Date(test.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2" title={test.topic}>
                      {test.topic}
                    </h3>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                        <p className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1">
                          <Target size={16} /> Accuracy
                        </p>
                        <p className={`font-bold text-xl ${test.accuracy >= 80 ? 'text-green-400' : test.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {test.accuracy}%
                        </p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                        <p className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1">
                          <Exam size={16} /> Score
                        </p>
                        <p className="font-bold text-xl text-white">
                          {test.score} <span className="text-gray-500 text-sm">/ {test.total_questions}</span>
                        </p>
                      </div>
                    </div>
                    
                    <button className="w-full py-3 bg-white/5 group-hover:bg-violet-600 font-bold text-gray-300 group-hover:text-white rounded-xl transition-all flex items-center justify-center gap-2">
                      Review Analysis <ArrowRight weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
