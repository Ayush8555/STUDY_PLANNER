'use client';

import { useState } from 'react';
import { PlayCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const res = await login(formData.email, formData.password);
        toast.success('Welcome back!');
        if (res.user?.hasOnboarded) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } else {
        if (!formData.name.trim()) { toast.error('Please enter your full name'); setIsSubmitting(false); return; }
        await register(formData.name, formData.email, formData.password);
        toast.success('Account created successfully!');
        router.push('/onboarding');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const switchTab = (toLogin) => { setIsLogin(toLogin); setFormData({ name: '', email: '', password: '' }); };

  return (
    <div className="flex w-full min-h-screen bg-[#FAFAFB] font-sans selection:bg-[#E65C00]/20 selection:text-[#E65C00] relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#FFD8C4] to-transparent opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-[#FFE5D9] to-transparent opacity-30 blur-3xl pointer-events-none" />

      {/* Left Pane */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-[#FFF5F0] via-[#FFF2EE] to-[#FFEDE7] shadow-[inset_-1px_0_0_rgba(226,232,240,0.5)] relative z-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-xl mb-16 hover:opacity-80 transition-opacity">
            <div className="text-[#E65C00] text-3xl"><PlayCircle weight="fill" /></div>
            <span className="font-semibold tracking-tight text-[#1A1A1A]">PrepMind <strong className="font-extrabold text-[#E65C00]">AI</strong></span>
          </Link>
          <div className="max-w-[480px]">
            <h1 className="text-4xl lg:text-[46px] font-extrabold tracking-tight leading-[1.15] text-[#1A1A1A] mb-8">
              Master your future with<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E65C00] to-[#FF8C42]">AI-powered learning.</span>
            </h1>
            <p className="text-[17px] text-[#5F6368] leading-relaxed max-w-[420px]">Join 50,000+ students using personalized AI paths to ace their technical interviews and exams.</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 max-w-[440px] hover:-translate-y-1 transition-transform duration-300">
          <svg className="w-8 h-8 text-[#FFD4B8] mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
          <p className="text-[#4B5563] italic mb-6 text-[15px] leading-relaxed">&quot;The AI tutor identified my weak spots in System Design in under 10 minutes. It&apos;s like having a senior engineer constantly by your side.&quot;</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1A365D] to-[#2B6CB0] flex items-center justify-center p-[2px] shadow-sm">
              <div className="w-full h-full rounded-full border-2 border-white flex items-end justify-center overflow-hidden bg-[#1A365D]"><div className="w-7 h-7 rounded-t-full bg-[#FDBA74] translate-y-2"></div></div>
            </div>
            <div>
              <div className="text-[14.5px] font-bold text-[#111827]">Alex Chen</div>
              <div className="text-[12px] font-medium text-[#6B7280]">Software Engineer at Google</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-6 sm:p-12 lg:p-24 bg-white relative z-10">
        <div className="max-w-[420px] w-full mx-auto">
          <Link href="/" className="flex lg:hidden items-center gap-2 text-xl mb-10">
            <div className="text-[#E65C00] text-3xl"><PlayCircle weight="fill" /></div>
            <span className="font-semibold tracking-tight text-[#1A1A1A]">PrepMind <strong className="font-extrabold text-[#E65C00]">AI</strong></span>
          </Link>

          <h2 className="text-[30px] font-extrabold text-[#1A1A1A] mb-2 tracking-tight">{isLogin ? 'Welcome back' : 'Create an account'}</h2>
          <p className="text-[15px] font-medium text-[#6B7280] mb-8">{isLogin ? 'Enter your details to access your account' : 'Start your personalized learning journey today'}</p>

          <div className="flex bg-gray-50/80 p-1.5 rounded-xl mb-8 relative">
            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${isLogin ? 'left-1.5' : 'left-[calc(50%+4.5px)]'}`} />
            <button onClick={() => switchTab(true)} className={`flex-1 py-2.5 text-[14px] font-bold z-10 transition-colors ${isLogin ? 'text-[#E65C00]' : 'text-[#6B7280]'}`}>Login</button>
            <button onClick={() => switchTab(false)} className={`flex-1 py-2.5 text-[14px] font-bold z-10 transition-colors ${!isLogin ? 'text-[#E65C00]' : 'text-[#6B7280]'}`}>Sign Up</button>
          </div>

          <button type="button" className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl py-3.5 text-[14.5px] font-bold text-[#374151] hover:bg-gray-50 hover:border-gray-300 transition-all mb-8 shadow-sm group">
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.89 16.79 15.72 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/><path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.57C14.74 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.85 14.12H2.18V16.97C3.98 20.53 7.7 23 12 23Z" fill="#34A853"/><path d="M5.85 14.12C5.63 13.46 5.5 12.75 5.5 12C5.5 11.25 5.63 10.54 5.85 9.88V7.03H2.18C1.46 8.47 1 10.18 1 12C1 13.82 1.46 15.53 2.18 16.97L5.85 14.12Z" fill="#FBBC05"/><path d="M12 5.38C13.62 5.38 15.07 5.93 16.21 7.02L19.36 3.87C17.46 2.09 14.97 1 12 1C7.7 1 3.98 3.47 2.18 7.03L5.85 9.88C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-gray-200 flex-1"></div>
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">OR CONTINUE WITH EMAIL</span>
            <div className="h-px bg-gradient-to-l from-transparent via-gray-200 to-gray-200 flex-1"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" key={isLogin ? 'login' : 'signup'}>
            {!isLogin && (
              <div>
                <label className="block text-[13px] font-bold text-[#374151] mb-2">Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className="w-full bg-[#FAFAFB] border border-gray-200 rounded-xl py-3 px-4 text-[15px] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E65C00]/20 focus:border-[#E65C00] focus:bg-white hover:border-gray-300 transition-all" />
              </div>
            )}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-2">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" required className="w-full bg-[#FAFAFB] border border-gray-200 rounded-xl py-3 px-4 text-[15px] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E65C00]/20 focus:border-[#E65C00] focus:bg-white hover:border-gray-300 transition-all" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[13px] font-bold text-[#374151]">Password</label>
                {isLogin && <a href="#" className="text-[12.5px] font-bold text-[#E65C00] hover:underline">Forgot Password?</a>}
              </div>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required minLength={6} className="w-full bg-[#FAFAFB] border border-gray-200 rounded-xl py-3 px-4 text-[15px] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E65C00]/20 focus:border-[#E65C00] focus:bg-white hover:border-gray-300 transition-all tracking-wider" />
            </div>

            {isLogin && (
              <div className="flex items-center gap-2.5 pt-1 pb-2">
                <input type="checkbox" id="keep-logged-in" className="w-4 h-4 rounded border-gray-300 text-[#E65C00] focus:ring-[#E65C00] cursor-pointer" />
                <label htmlFor="keep-logged-in" className="text-[13.5px] font-medium text-[#6B7280] cursor-pointer">Keep me logged in</label>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center py-3.5 rounded-xl text-[15px] font-bold text-white bg-[#E65C00] hover:bg-[#D95300] shadow-[0_4px_14px_0_rgba(230,92,0,0.25)] transition-all hover:-translate-y-[2px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="text-[12.5px] font-medium text-center text-[#9CA3AF] mt-8 max-w-[320px] mx-auto leading-relaxed">
            By continuing, you agree to PrepMind AI&apos;s <a href="#" className="font-bold text-[#374151] hover:text-[#E65C00] transition-colors">Terms of Service</a> and <a href="#" className="font-bold text-[#374151] hover:text-[#E65C00] transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
