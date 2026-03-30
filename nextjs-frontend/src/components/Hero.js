'use client';

import { Sparkle, CheckCircle } from '@phosphor-icons/react';

const Hero = () => {
  return (
    <section className="relative flex flex-col items-center pt-20 pb-8 text-center overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(89,86,223,0.08)_0%,rgba(250,250,251,0)_70%)] -z-10 pointer-events-none" />

      <div className="max-w-[800px] mb-16 flex flex-col items-center px-4">
        <div className="inline-flex items-center gap-1.5 bg-badge-bg text-badge-text text-xs font-bold tracking-wider px-3.5 py-1.5 rounded-full uppercase mb-6">
          <Sparkle weight="fill" className="text-sm" /> AI-POWERED LEARNING
        </div>

        <h1 className="text-[2.25rem] md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-tight text-text-dark mb-6">
          Your Personal AI Study Planner<br className="hidden md:block" />{' '}for <span className="text-gradient">Competitive Exams</span>
        </h1>

        <p className="text-base md:text-lg text-text-muted mb-10 max-w-[600px]">
          Get personalized timetables, AI-generated tests, and smart analytics to maximize your exam performance. Designed for UPSC, JEE, NEET, and more.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <a href="#start" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg text-[15px] font-semibold text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all hover:-translate-y-[1px]">
            Start Free
          </a>
          <a href="#generate" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg text-[15px] font-semibold text-text-dark bg-surface border border-gray-200 shadow-sm hover:bg-bg transition-all hover:-translate-y-[1px]">
            Generate My Timetable
          </a>
        </div>
      </div>

      <div className="relative w-full max-w-[900px] px-4 md:px-8">
        <div className="relative bg-surface rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mx-auto z-10 flex flex-col" style={{ aspectRatio: '16/10' }}>
          <div className="h-10 bg-surface border-b border-gray-200 flex items-center px-4 shrink-0">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </div>

          <div className="flex flex-1 bg-bg overflow-hidden">
            <div className="hidden md:block w-60 bg-surface border-r border-gray-200 shrink-0 p-6 space-y-6">
              <div className="h-4 bg-gray-100 rounded w-4/5" />
              <div className="space-y-4">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
              <div className="space-y-4 pt-4">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>

            <div className="flex-1 p-6 md:p-10 overflow-hidden">
              <div className="text-xl md:text-2xl font-bold text-text-dark mb-6 text-left">Student Dashboard</div>
              <div className="space-y-4 mb-6">
                <div className="bg-surface border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-text-muted">Name:</div>
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-text-muted">Exam:</div>
                    <div className="h-3 bg-gray-100 rounded w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-text-muted">Subjects:</div>
                    <div className="flex gap-2">
                      <div className="h-5 bg-purple-100 rounded-full w-16" />
                      <div className="h-5 bg-blue-100 rounded-full w-14" />
                      <div className="h-5 bg-pink-100 rounded-full w-12" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm font-bold text-text-dark mb-3 text-left">Recent Performance</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-6 bg-blue-100 rounded w-full" />
                </div>
                <div className="bg-surface border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-6 bg-purple-100 rounded w-full" />
                </div>
                <div className="bg-surface border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-6 bg-green-100 rounded w-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 md:top-4 md:right-[-0.5rem] md:bottom-auto bg-surface py-3 px-4 rounded-xl shadow-xl flex items-center gap-3 z-20 animate-float border border-gray-100">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-lg text-green-500 shrink-0">
              <CheckCircle weight="fill" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-text-muted">Daily Goal</span>
              <span className="text-sm font-bold text-text-dark whitespace-nowrap">100% Completed</span>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-3 left-[3%] w-[94%] h-4 bg-gray-200 rounded-b-2xl shadow-md z-0" />
      </div>
    </section>
  );
};

export default Hero;
