import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import ChatbotWrapper from '@/components/ChatbotWrapper';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg font-sans selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
      <ChatbotWrapper />
    </div>
  );
}
