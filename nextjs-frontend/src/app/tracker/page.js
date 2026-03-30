'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/services/api';
import {
  MagnifyingGlass, Plus, CaretDown, Check, Circle, X,
  Fire, ArrowLeft, DownloadSimple, CheckCircle, SignOut, Lightning
} from '@phosphor-icons/react';
import toast, { Toaster } from 'react-hot-toast';
import ChatbotWrapper from '@/components/ChatbotWrapper';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/tracker');

const SUBJECT_COLORS = {
  'History': { bg: 'bg-[#FAEBE4]', text: 'text-[#B45309]', border: 'border-transparent' },
  'Geography': { bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]', border: 'border-transparent' },
  'Polity': { bg: 'bg-[#E0E7FF]', text: 'text-[#4338CA]', border: 'border-transparent' },
  'Economics': { bg: 'bg-[#F3E8FF]', text: 'text-[#6B21A8]', border: 'border-transparent' },
  'Science': { bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]', border: 'border-transparent' },
};

const STATUS_STYLES = {
  'completed': { dot: 'bg-green-600', text: 'text-green-600', label: 'Completed', bg: 'bg-green-100' },
  'in_progress': { dot: 'bg-blue-600', text: 'text-blue-600', label: 'In Progress', bg: 'bg-blue-100' },
  'pending': { dot: 'bg-gray-500', text: 'text-gray-500', label: 'Pending', bg: 'bg-gray-100' },
};

const PRIORITY_STYLES = {
  'high': { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  'medium': { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  'low': { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

// ─── SKELETON LOADER ─────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-5 border-b border-gray-50">
          <div className="w-16 h-4 bg-gray-200 rounded" />
          <div className="w-20 h-6 bg-gray-200 rounded-full" />
          <div className="flex-1 h-4 bg-gray-200 rounded" />
          <div className="w-24 h-6 bg-gray-200 rounded" />
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
          </div>
          <div className="w-20 h-4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── CIRCULAR PROGRESS ───────────────────────────────────────────
function CircularProgress({ percentage, size = 70 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative hover:scale-105 transition-transform duration-300" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
        <defs>
          <linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.4)" strokeWidth="5" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#progGrad)" strokeWidth="5" fill="none"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out drop-shadow-md"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[14px] font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">{percentage}%</span>
      </div>
    </div>
  );
}

// ─── ADD CHAPTER MODAL ───────────────────────────────────────────
function AddChapterModal({ isOpen, onClose, onAdd, subjects }) {
  const [subjectName, setSubjectName] = useState('');
  const [className, setClassName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectName || !chapterName) {
      toast.error('Subject and chapter name are required');
      return;
    }
    setLoading(true);
    try {
      await onAdd({ subject_name: subjectName, class_number: className || null, chapter_name: chapterName });
      setSubjectName('');
      setClassName('');
      setChapterName('');
      onClose();
    } catch (err) {
      // handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-[16px] font-extrabold text-[#1A1A1A]">Add Custom Chapter</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Subject *</label>
            <select
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF]"
            >
              <option value="">Select a subject</option>
              {(subjects || ['History', 'Geography', 'Polity', 'Economics', 'Science']).map(s => (
                <option key={typeof s === 'string' ? s : s.name} value={typeof s === 'string' ? s : s.name}>
                  {typeof s === 'string' ? s : s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Class (Optional)</label>
            <select
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF]"
            >
              <option value="">No class</option>
              {[6, 7, 8, 9, 10, 11, 12].map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Chapter Name *</label>
            <input
              type="text"
              value={chapterName}
              onChange={e => setChapterName(e.target.value)}
              placeholder="Enter chapter name"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !subjectName || !chapterName}
            className="w-full py-2.5 rounded-lg bg-[#1A1A2E] text-white text-[13px] font-bold hover:bg-[#2A2A3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Plus size={16} weight="bold" /> Add Chapter</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── STATUS DROPDOWN ─────────────────────────────────────────────
function StatusDropdown({ status, onUpdate, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;

  useEffect(() => {
    const handleClick = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    };
    const handleScroll = () => {
      if (open) setOpen(false); // Close on scroll ensures portal doesn't detach
    };

    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true); 
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        left: rect.left,
        top: rect.bottom + 4,
        width: rect.width
      });
    }
    setOpen(!open);
  };

  const menu = open && typeof document !== 'undefined' ? createPortal(
    <div 
      ref={dropdownRef}
      className="fixed bg-white opacity-100 rounded-xl border border-gray-200 shadow-xl z-[9999] py-1 overflow-hidden"
      style={{ top: coords.top, left: coords.left, minWidth: '140px' }}
    >
      {Object.entries(STATUS_STYLES).map(([key, val]) => (
        <button
          key={key}
          onClick={() => { onUpdate(key); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-gray-100 transition-colors ${status === key ? 'bg-gray-50 text-indigo-700 font-bold' : 'text-gray-700'}`}
        >
          <span className={`w-2 h-2 rounded-full ${val.dot}`} />
          {val.label}
          {status === key && <Check size={12} className="ml-auto text-emerald-500" weight="bold" />}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={handleOpen}
        disabled={disabled}
        className={`flex items-center min-w-[120px] justify-between gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:shadow-sm ${style.bg} ${style.text} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
          {style.label}
        </div>
        <CaretDown size={12} weight="bold" className="ml-1 opacity-70" />
      </button>
      {menu}
    </div>
  );
}

// ─── REVISION BUTTON ─────────────────────────────────────────────
function RevisionButton({ label, done, enabled, onToggle, disabled }) {
  const base = done
    ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-md shadow-green-500/30 glow border-transparent'
    : enabled
      ? 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:shadow-inner cursor-pointer'
      : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';

  return (
    <button
      onClick={() => enabled && !disabled && onToggle(!done)}
      disabled={!enabled || disabled}
      title={!enabled ? (done ? '' : 'Complete previous revision first') : (done ? `Undo ${label}` : `Mark ${label} done`)}
      className={`w-[22px] h-[22px] sm:w-[26px] sm:h-[26px] rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center transition-all duration-300 ${done ? 'hover:scale-110 shadow-lg' : 'hover:scale-105 hover:bg-gray-200'} ${base}`}
    >
      {label}
    </button>
  );
}

// ─── CLASS FILTER DROPDOWN ───────────────────────────────────────
function ClassFilterDropdown({ selectedClasses, onToggle, allClasses }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const label = selectedClasses.length === 0 || selectedClasses.length === allClasses.length
    ? '6, 7, 8...'
    : selectedClasses.sort((a, b) => a - b).join(', ');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-[13px] font-medium hover:shadow-sm transition-all"
      >
        <span className="text-[#9CA3AF]">Class</span>
        <span className="font-bold text-[#1A1A1A]">{label}</span>
        <CaretDown size={14} weight="bold" className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-lg z-20 w-40 py-2">
          {allClasses.map(c => (
            <button
              key={c}
              onClick={() => onToggle(c)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-gray-50 transition-colors ${selectedClasses.includes(c) ? 'text-[#5956DF] font-bold' : 'text-gray-600'}`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedClasses.includes(c) ? 'bg-[#5956DF] border-[#5956DF]' : 'border-gray-300'}`}>
                {selectedClasses.includes(c) && <Check size={10} weight="bold" className="text-white" />}
              </div>
              Class {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────
export default function TrackerPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [chapters, setChapters] = useState([]);
  const [summary, setSummary] = useState({ total_chapters: 0, completed: 0, pending: 0, in_progress: 0, progress_percentage: 0, revision_health: 0 });
  const [weekly, setWeekly] = useState({ completed_this_week: 0, streak: 0 });
  const [filters, setFilters] = useState({ subjects: [], classes: [] });
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  // Fetch chapters
  const fetchChapters = useCallback(async (subject, classes, search) => {
    try {
      const params = new URLSearchParams();
      if (subject && subject !== 'all') params.set('subject', subject);
      if (classes && classes.length > 0) params.set('classNumber', classes.join(','));
      if (search) params.set('search', search);

      const { data } = await api.get(`/tracker/chapters?${params.toString()}`);
      if (data.success) {
        setChapters(data.chapters);
        setFilters(data.filters);
      }
    } catch (err) {
      console.error('Failed to fetch chapters:', err);
    } finally {
      setLoadingChapters(false);
    }
  }, []);

  // Fetch summary + weekly
  const fetchSummary = useCallback(async () => {
    try {
      const [sumRes, weekRes] = await Promise.all([
        api.get('/tracker/summary'),
        api.get('/tracker/weekly-summary'),
      ]);
      if (sumRes.data.success) setSummary(sumRes.data.summary);
      if (weekRes.data.success) setWeekly(weekRes.data.weekly);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchChapters(selectedSubject, selectedClasses, searchQuery);
      fetchSummary();
    }
  }, [user]); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    if (!user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoadingChapters(true);
      fetchChapters(selectedSubject, selectedClasses, searchQuery);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [selectedSubject, selectedClasses, searchQuery]); // eslint-disable-line

  // Update handler with optimistic UI
  const handleUpdate = async (chapter, field, value) => {
    const chapterId = chapter.id;
    if (updatingIds.has(chapterId + field)) return; // prevent double click

    // Optimistic update
    setChapters(prev => prev.map(ch => {
      if (ch.id !== chapterId) return ch;
      const updated = { ...ch, [field]: value };
      // Auto-set ncert when completed
      if (field === 'status' && value === 'completed') updated.ncert_read = true;
      if (field === 'status' && value === 'pending') {
        updated.ncert_read = false;
        updated.revision1_done = false;
        updated.revision2_done = false;
        updated.revision3_done = false;
        updated.revision4_done = false;
        updated.last_revised_at = null;
      }
      // Cascading revision resets
      if (field === 'revision1_done' && !value) {
        updated.revision2_done = false;
        updated.revision3_done = false;
        updated.revision4_done = false;
      }
      if (field === 'revision2_done' && !value) {
        updated.revision3_done = false;
        updated.revision4_done = false;
      }
      if (field === 'revision3_done' && !value) {
        updated.revision4_done = false;
      }
      // Set revision date and last_revised
      if (field.startsWith('revision') && value) {
        updated[field.replace('_done', '_date')] = new Date().toISOString();
        updated.last_revised_at = new Date().toISOString();
      }
      return updated;
    }));

    setUpdatingIds(prev => new Set([...prev, chapterId + field]));

    try {
      await api.post('/tracker/update-status', {
        tracker_id: chapter.tracker_id,
        chapter_id: chapter.id,
        field,
        value,
      });
      fetchSummary(); // Refresh summary in background
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
      // Revert optimistic update
      fetchChapters(selectedSubject, selectedClasses, searchQuery);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(chapterId + field);
        return next;
      });
    }
  };

  // Add chapter handler
  const handleAddChapter = async (data) => {
    try {
      const res = await api.post('/tracker/add-chapter', data);
      if (res.data.success) {
        toast.success('Chapter added successfully!');
        fetchChapters(selectedSubject, selectedClasses, searchQuery);
        fetchSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add chapter');
      throw err;
    }
  };

  // Toggle class filter
  const handleClassToggle = (classNum) => {
    setSelectedClasses(prev =>
      prev.includes(classNum) ? prev.filter(c => c !== classNum) : [...prev, classNum]
    );
  };

  // Export report as CSV
  const handleExport = () => {
    const rows = [['Class', 'Subject', 'Chapter', 'Status', 'NCERT', 'R1', 'R2', 'R3', 'R4', 'Last Revised']];
    chapters.forEach(ch => {
      rows.push([
        ch.class_number ? `Class ${ch.class_number}` : '-',
        ch.subject,
        ch.chapter_name,
        ch.status,
        ch.ncert_read ? 'Yes' : 'No',
        ch.revision1_done ? 'Yes' : 'No',
        ch.revision2_done ? 'Yes' : 'No',
        ch.revision3_done ? 'Yes' : 'No',
        ch.revision4_done ? 'Yes' : 'No',
        ch.last_revised_at ? new Date(ch.last_revised_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'preparation_tracker_report.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported!');
  };

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
      <div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" />
    </div>
  );

  const allClassNumbers = filters.classes?.map(c => c.class_number) || [6, 7, 8, 9, 10, 11, 12];
  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-cyan-50 font-sans flex text-[#1A1A1A]">
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '13px', fontWeight: 600 } }} />

      {/* ═══ SIDEBAR ═══ */}
      <aside className="hidden lg:flex flex-col w-[200px] bg-white border-r border-gray-100 min-h-screen py-6 px-4 fixed left-0 top-0 z-40">
        <div className="flex items-center gap-2 px-2 mb-10">
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
        <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C79F2] flex items-center justify-center text-white font-bold text-xs shadow-sm">{firstName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#1A1A1A] truncate">{user?.name}</p><p className="text-[10px] text-[#9CA3AF]">Scholar Tier</p></div>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 lg:ml-[200px]">
        {/* Top bar */}
        <header className="sticky top-0 bg-white/50 backdrop-blur-xl border-b border-white/40 z-30 shadow-sm">
          <div className="flex items-center justify-between px-6 lg:px-8 h-14">
            <div className="flex lg:hidden items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#5956DF]" /><span className="font-semibold text-[15px]">PrepMind <strong className="text-[#5956DF]">AI</strong></span></div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <Fire size={13} weight="fill" className="text-[#F59E0B]" />
                  <span className="text-[12px] font-bold text-[#374151]">{weekly.streak} Day Streak</span>
                </div>
              </div>
              <button onClick={() => { logout(); router.push('/login'); }} className="text-[12px] font-medium text-[#9CA3AF] hover:text-red-500 flex items-center gap-1"><SignOut size={14} /></button>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-6 w-full max-w-[1400px] mx-auto">
          {/* ═══ HEADER ═══ */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[28px]">📊</span>
                <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight">Preparation Tracker</h1>
              </div>
              <p className="text-[14px] text-[#6B7280] ml-1">Track your NCERT + Subject-wise preparation progress</p>
            </div>
            <div className="flex items-center gap-4">
              <CircularProgress percentage={summary.progress_percentage} />
              <div>
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Overall Progress</p>
                <p className="text-[18px] font-extrabold text-[#1A1A1A]">{summary.completed} / {summary.total_chapters} <span className="text-[13px] font-medium text-[#6B7280]">Chapters</span></p>
              </div>
            </div>
          </div>

          {/* ═══ FILTERS BAR ═══ */}
          <div className="flex flex-wrap items-center gap-3 mb-6 bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-3 rounded-2xl hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200/50 bg-white/50 text-[13px] font-medium backdrop-blur-md">
              <span className="text-[#9CA3AF]">Exam</span>
              <span className="font-bold text-[#1A1A1A]">UPSC</span>
            </div>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-4 py-2.5 rounded-full border border-gray-200 bg-white text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {filters.subjects?.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>

            {/* Class Filter */}
            <ClassFilterDropdown
              selectedClasses={selectedClasses}
              onToggle={handleClassToggle}
              allClasses={allClassNumbers}
            />

            {/* Search */}
            <div className="flex-1 relative min-w-[200px]">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chapter..."
                className="w-full pl-9 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 placeholder-gray-400"
              />
            </div>

            {/* Add Chapter Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[13px] font-bold shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 hover:-translate-y-0.5 hover:scale-105 transition-all duration-300"
            >
              <Plus size={16} weight="bold" /> Add Chapter
            </button>
          </div>

          {/* ═══ CONTENT GRID ═══ */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
            {/* ── TABLE ── */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
              {/* Table Header */}
              <div className="grid grid-cols-[80px_110px_1fr_120px_60px_160px_100px] items-center gap-2 px-5 py-4 border-b border-white/40 bg-white/40 backdrop-blur-md">
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Class</span>
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Subject</span>
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Chapter Name</span>
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Status</span>
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">NCERT</span>
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Revision (1-4)</span>
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right pr-2">Priority</span>
              </div>

              {/* Table Body */}
              {loadingChapters ? (
                <TableSkeleton />
              ) : chapters.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">No chapters found</p>
                  <p className="text-[12px] text-[#9CA3AF]">Try adjusting your filters or add a custom chapter</p>
                </div>
              ) : (
                <div className="max-h-[65vh] overflow-y-auto">
                  {chapters.map((ch, idx) => {
                    const subjectColor = SUBJECT_COLORS[ch.subject] || SUBJECT_COLORS.History;
                    let rowBg = 'bg-gray-50/40';
                    if (ch.status === 'completed') rowBg = 'bg-green-50/70';
                    if (ch.status === 'in_progress') rowBg = 'bg-blue-50/70';

                    const priorityStyle = PRIORITY_STYLES[ch.priority?.toLowerCase() || 'medium'];

                    return (
                      <div
                        key={ch.id + idx}
                        className={`grid grid-cols-[80px_110px_1fr_120px_60px_160px_100px] items-center gap-2 px-5 py-4 border-b border-white/30 hover:bg-indigo-50/80 hover:shadow-sm hover:-translate-y-[1px] transition-all duration-200 ${rowBg}`}
                      >
                        {/* Class */}
                        <span className="text-[13px] font-semibold text-[#374151]">
                          {ch.class_number ? `Class ${ch.class_number}` : '-'}
                        </span>

                        {/* Subject Badge */}
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${subjectColor.bg} ${subjectColor.text}`}>
                          {ch.subject}
                        </span>

                        {/* Chapter Name */}
                        <span className="text-[13px] font-semibold text-[#1A1A1A] pr-2 truncate" title={ch.chapter_name}>
                          {ch.chapter_name}
                        </span>

                        {/* Status */}
                        <StatusDropdown
                          status={ch.status}
                          onUpdate={(val) => handleUpdate(ch, 'status', val)}
                        />

                        {/* NCERT Done */}
                        <button
                          onClick={() => ch.status !== 'pending' && handleUpdate(ch, 'ncert_read', !ch.ncert_read)}
                          disabled={ch.status === 'pending'}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${ch.ncert_read
                            ? 'text-[#059669]'
                            : ch.status === 'pending'
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-300 hover:text-gray-400 cursor-pointer'
                            }`}
                        >
                          {ch.ncert_read ? <CheckCircle size={22} weight="fill" /> : <Circle size={22} weight="bold" />}
                        </button>

                        {/* Revisions */}
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-1 mb-1">
                            <RevisionButton
                              label="R1" done={ch.revision1_done}
                              enabled={ch.status === 'completed'}
                              onToggle={(v) => handleUpdate(ch, 'revision1_done', v)}
                            />
                            <RevisionButton
                              label="R2" done={ch.revision2_done}
                              enabled={ch.revision1_done}
                              onToggle={(v) => handleUpdate(ch, 'revision2_done', v)}
                            />
                            <RevisionButton
                              label="R3" done={ch.revision3_done}
                              enabled={ch.revision2_done}
                              onToggle={(v) => handleUpdate(ch, 'revision3_done', v)}
                            />
                            <RevisionButton
                              label="R4" done={ch.revision4_done}
                              enabled={ch.revision3_done}
                              onToggle={(v) => handleUpdate(ch, 'revision4_done', v)}
                            />
                          </div>
                          <span className="text-[9px] text-gray-400">
                            {ch.last_revised_at
                              ? `Last: ${new Date(ch.last_revised_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : ch.status === 'completed' ? 'Pending Revision' : ''
                            }
                          </span>
                        </div>

                        {/* Priority */}
                        <div className="flex justify-end pr-2">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${priorityStyle.bg} ${priorityStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                            {ch.priority || 'medium'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="space-y-6">
              {/* Weekly Summary */}
              <div className="relative p-[2px] rounded-3xl bg-gradient-to-br from-indigo-500 to-green-500 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="bg-white/80 backdrop-blur-xl rounded-[22px] p-6 xl:p-8 h-full">
                  <h3 className="text-[18px] font-extrabold text-[#1A1A1A] mb-5">Weekly Summary</h3>
                  
                  <div className="bg-green-50/80 backdrop-blur-md rounded-2xl rounded-l-sm border-l-4 border-green-500 p-4 mb-8 shadow-sm">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Fire size={18} weight="fill" className="text-green-600" />
                      <span className="text-[14px] font-bold text-green-700">{weekly.streak} Week Streak</span>
                    </div>
                    <p className="text-[13px] font-bold text-[#1A1A1A] leading-relaxed">
                      🔥 You completed {weekly.completed_this_week} chapters this week!
                    </p>
                  </div>

                {/* Stats */}
                <div className="space-y-4 mb-8 border-b border-gray-100 pb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#6B7280]">Total Chapters</span>
                    <span className="text-[15px] font-extrabold text-[#1A1A1A]">{summary.total_chapters}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#6B7280]">Completed</span>
                    <span className="text-[15px] font-extrabold text-[#059669]">{summary.completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#6B7280]">Pending</span>
                    <span className="text-[15px] font-extrabold text-red-600">{summary.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#6B7280]">In Progress</span>
                    <span className="text-[15px] font-extrabold text-[#4338CA]">{summary.in_progress}</span>
                  </div>
                </div>
              </div>
            </div>


              {/* Revision Health */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 p-5">
                <h3 className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Revision Health</h3>
                <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden mb-2 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    style={{ width: `${summary.revision_health}%` }}
                  />
                </div>
                <p className="text-[12px] text-[#6B7280]">
                  <strong className="text-indigo-600">{summary.revision_health}%</strong> of completed chapters are revised twice.
                </p>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/70 backdrop-blur-xl border border-white/40 text-[13px] font-bold text-[#374151] hover:bg-white hover:shadow-lg hover:-translate-y-1 hover:text-indigo-600 transition-all duration-300 shadow-md"
              >
                <DownloadSimple size={18} weight="bold" /> Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddChapterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdd={handleAddChapter}
        subjects={filters.subjects?.map(s => s.name)}
      />
      <ChatbotWrapper />
    </div>
  );
}
