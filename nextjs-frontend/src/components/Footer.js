'use client';

import { PlayCircle, TwitterLogo, InstagramLogo } from '@phosphor-icons/react';

const Footer = () => {
  return (
    <footer className="bg-surface border-t border-gray-200 pt-16 pb-8 text-sm">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-16">
          <div className="lg:col-span-2 flex flex-col items-center md:items-start text-center md:text-left">
            <a href="#" className="flex items-center gap-2 text-xl text-text-dark mb-4">
              <div className="flex items-center justify-center text-primary text-2xl"><PlayCircle weight="fill" /></div>
              <span className="font-semibold tracking-tight">PrepMind <strong className="font-extrabold text-primary">AI</strong></span>
            </a>
            <p className="text-text-muted leading-relaxed max-w-[250px]">Empowering students with AI-driven learning tools for global competitive exams.</p>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="font-bold text-text-dark mb-5">Product</h4>
            <ul className="flex flex-col gap-3.5 text-text-muted">
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#success" className="hover:text-primary transition-colors">Success Stories</a></li>
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="font-bold text-text-dark mb-5">Support</h4>
            <ul className="flex flex-col gap-3.5 text-text-muted">
              <li><a href="#help" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="font-bold text-text-dark mb-5">Connect</h4>
            <div className="flex gap-4">
              <a href="#twitter" aria-label="Twitter" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all"><TwitterLogo size={18} /></a>
              <a href="#instagram" aria-label="Instagram" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all"><InstagramLogo size={18} /></a>
            </div>
          </div>
        </div>
        <div className="text-center pt-8 border-t border-gray-200 text-text-muted">
          <p>&copy; 2026 PrepMind AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
