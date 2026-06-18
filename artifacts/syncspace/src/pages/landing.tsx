import { useState } from 'react';
import { Link } from 'wouter';
import { useAuthStore } from '@/store';
import { 
  Video, Layout, Folder, Brain, Shield, ArrowRight, 
  Check, Copy, HelpCircle, ChevronDown, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function Landing() {
  const token = useAuthStore((state) => state.token);
  const [copied, setCopied] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/demo-room-id`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const features = [
    {
      icon: <Video className="text-[#57c1ff]" size={20} />,
      title: "HD Video & Voice",
      description: "Low-latency WebRTC video conferencing with active speaker detection and direct peer connections."
    },
    {
      icon: <Layout className="text-[#59d499]" size={20} />,
      title: "Interactive Whiteboard",
      description: "Collaborate in real-time with an infinite whiteboard featuring shapes, pens, text, and instant state sync."
    },
    {
      icon: <Folder className="text-[#ffc533]" size={20} />,
      title: "Workspace File Sharing",
      description: "Securely upload and share documents, images, and archives directly inside your workspaces."
    },
    {
      icon: <Brain className="text-[#ff6161]" size={20} />,
      title: "SyncBot AI Assistant",
      description: "Get smart summaries of meeting chats and ask contextual Q&A utilizing advanced LLMs."
    }
  ];

  const faqs = [
    {
      q: "Is SyncSpace secure?",
      a: "Yes. All communication channels are JWT-token authorized. Video meetings use WebRTC mesh networks ensuring direct peer-to-peer data flow, and file uploads are filtered by extension and size to ensure system safety."
    },
    {
      q: "Can I use the whiteboard during a call?",
      a: "Absolutely. The whiteboard integrates seamlessly into the room page or can be opened full screen, updating in real-time for all participants."
    },
    {
      q: "How does the SyncBot AI Assistant work?",
      a: "SyncBot analyzes meeting chat logs, notes, and activity to generate smart summaries, action items, or answer direct queries to catch you up in seconds."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07080a] text-[#cdcdcd] overflow-x-hidden font-sans antialiased selection:bg-white/10 selection:text-white">
      
      {/* Signature Red Diagonal Stripe launch banner at the very top */}
      <div className="h-2 w-full bg-gradient-to-r from-[#ff5757] to-[#a1131a] opacity-90" />
      
      {/* Navbar - Primary Nav styling */}
      <header className="sticky top-0 z-50 w-full border-b border-[#242728] bg-[#07080a] h-14 flex items-center">
        <div className="max-w-[1200px] w-full mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[6px] bg-[#121212] border border-[#242728] flex items-center justify-center text-white">
              <Video size={14} className="text-[#57c1ff]" />
            </div>
            <span className="font-semibold text-[16px] tracking-tight text-[#f4f4f6]">SyncSpace</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#9c9c9d]">
            <a href="#features" className="hover:text-[#f4f4f6] transition-colors">Features</a>
            <a href="#security" className="hover:text-[#f4f4f6] transition-colors">Security</a>
            <a href="#faq" className="hover:text-[#f4f4f6] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            {token ? (
              <Button asChild className="bg-white hover:bg-[#e8e8e8] text-black font-semibold text-[13px] px-4 py-1.5 h-8 rounded-[8px] border-0 transition-colors">
                <Link href="/dashboard">Go to Workspace</Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="text-[14px] font-medium text-[#9c9c9d] hover:text-[#f4f4f6] transition-colors">
                  Sign In
                </Link>
                <Button asChild className="bg-white hover:bg-[#e8e8e8] text-black font-semibold text-[13px] px-4 py-1.5 h-8 rounded-[8px] border-0 transition-colors shadow-none">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-6 max-w-[1200px] mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101111] border border-[#242728] text-[12px] font-medium text-[#57c1ff] mb-6"
        >
          <Sparkles size={12} /> Real-time team collaboration reborn
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-[64px] font-semibold tracking-tight text-[#f4f4f6] max-w-4xl leading-[1.1] mb-8 font-sans"
          style={{ fontFeatureSettings: '"calt", "kern", "liga", "ss03", "ss02", "ss08"' }}
        >
          The collaborative hub for{' '}
          <span className="text-white">
            modern remote teams.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[16px] md:text-[18px] text-[#9c9c9d] max-w-2xl leading-relaxed mb-10"
        >
          SyncSpace combines high-definition meetings, real-time interactive whiteboards, secure file repositories, and smart AI support into a single premium workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button asChild className="bg-white hover:bg-[#e8e8e8] text-black font-semibold px-6 py-5 rounded-[8px] text-[14px] border-0 transition-colors">
            <Link href={token ? "/dashboard" : "/register"}>
              {token ? "Open Workspace" : "Get Started Free"}
            </Link>
          </Button>
          <a href="#features">
            <Button className="bg-transparent hover:bg-white/[0.04] text-white border border-[#242728] font-medium px-6 py-5 rounded-[8px] text-[14px] transition-colors">
              Learn More
            </Button>
          </a>
        </motion.div>

        {/* Hero Interactive Command Palette Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 w-full max-w-[850px] rounded-[16px] bg-[#0d0d0d] border border-[#242728] p-0 overflow-hidden flex flex-col text-left"
        >
          {/* macOS window header */}
          <div className="h-10 px-4 border-b border-[#242728] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-white/10" />
              <span className="w-3 h-3 rounded-full bg-white/10" />
              <span className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <span className="text-[12px] text-[#6a6b6c]">SyncSpace Launcher</span>
            <div className="w-12" />
          </div>

          {/* Search bar */}
          <div className="h-12 px-4 border-b border-[#242728] bg-[#101111] flex items-center gap-3">
            <Video size={16} className="text-[#6a6b6c]" />
            <input 
              type="text" 
              placeholder="Search workspaces, rooms, tools..." 
              className="bg-transparent border-0 text-[14px] text-white placeholder-[#6a6b6c] focus:outline-none w-full"
              readOnly
            />
            <div className="flex items-center gap-1">
              <span className="keycap">⌘</span>
              <span className="keycap">K</span>
            </div>
          </div>

          {/* Command rows list */}
          <div className="p-2 space-y-0.5 bg-[#0d0d0d]">
            <div className="flex items-center justify-between p-2.5 rounded-[6px] bg-[#121212] cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#101111] border border-[#242728] flex items-center justify-center">
                  <Video size={14} className="text-[#57c1ff]" />
                </div>
                <div>
                  <span className="text-[14px] font-medium text-[#f4f4f6]">Create New Meeting Room</span>
                  <span className="text-[12px] text-[#6a6b6c] ml-3">Start a video conference</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="keycap">⌘</span>
                <span className="keycap">N</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#121212] transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#101111] border border-[#242728] flex items-center justify-center">
                  <Layout size={14} className="text-[#59d499]" />
                </div>
                <div>
                  <span className="text-[14px] font-medium text-[#f4f4f6]">Open Collaborative Whiteboard</span>
                  <span className="text-[12px] text-[#6a6b6c] ml-3">Infinite interactive canvas</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="keycap">⌘</span>
                <span className="keycap">W</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#121212] transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#101111] border border-[#242728] flex items-center justify-center">
                  <Folder size={14} className="text-[#ffc533]" />
                </div>
                <div>
                  <span className="text-[14px] font-medium text-[#f4f4f6]">Browse Shared Files</span>
                  <span className="text-[12px] text-[#6a6b6c] ml-3">Manage and download workspace files</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="keycap">⌘</span>
                <span className="keycap">F</span>
              </div>
            </div>
          </div>

          {/* Footer bar */}
          <div className="h-9 px-4 border-t border-[#242728] bg-[#101111] flex items-center justify-between text-[11px] text-[#6a6b6c]">
            <span>Tip: Use keys to navigate and press enter to execute</span>
            <div className="flex items-center gap-2">
              <span className="keycap">Esc</span>
              <span>to close</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 border-t border-[#242728] bg-[#0d0d0d] px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-[56px] font-medium tracking-tight text-[#f4f4f6] mb-4">A unified space for your projects</h2>
            <p className="text-[#9c9c9d] max-w-xl mx-auto text-[16px]">Everything you need to collaborate with your remote team in one high-performance interface.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div 
                key={i} 
                className="bg-[#07080a] border border-[#242728] rounded-[10px] p-6 shadow-none group relative overflow-hidden"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[#101111] border border-[#242728] flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-[18px] font-medium text-[#f4f4f6] mb-2">{f.title}</h3>
                <p className="text-[14px] text-[#9c9c9d] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="bg-[#0d0d0d] rounded-[10px] border border-[#242728] p-8">
          <div className="space-y-6">
            {[
              "JWT Token authorized session handshakes",
              "Direct peer-to-peer WebRTC video mesh topology",
              "Ephemeral disk storage & Neon PostgreSQL architecture",
              "Strict file sharing filters limiting uploads to 10MB"
            ].map((text, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-[4px] bg-[#59d499]/15 border border-[#59d499]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#59d499]">
                  <Check size={12} />
                </div>
                <p className="text-[#cdcdcd] text-[14px] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101111] border border-[#242728] text-[12px] font-medium text-[#57c1ff] mb-6">
            <Shield size={12} /> Secure Architecture
          </div>
          <h2 className="text-3xl md:text-[56px] font-medium tracking-tight text-[#f4f4f6] mb-6 leading-tight">Designed with privacy first</h2>
          <p className="text-[#9c9c9d] leading-relaxed mb-6 text-[15px]">
            SyncSpace runs on modern, secure peer architecture. Your data is protected by industry standard encryption models, and meeting logs are stored securely in a dedicated private cloud database.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-[#242728] bg-[#07080a] px-6">
        <div className="max-w-[768px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101111] border border-[#242728] text-[12px] font-medium text-[#ff6161] mb-6">
              <HelpCircle size={12} /> FAQ
            </div>
            <h2 className="text-3xl md:text-[56px] font-medium tracking-tight text-[#f4f4f6]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = faqOpen === i;
              return (
                <div 
                  key={i} 
                  className="bg-[#0d0d0d] border border-[#242728] rounded-[10px] overflow-hidden"
                >
                  <button 
                    onClick={() => toggleFaq(i)}
                    className="w-full px-6 py-4.5 flex items-center justify-between text-left font-medium text-white hover:text-white transition-colors"
                  >
                    <span className="text-[16px]">{faq.q}</span>
                    <ChevronDown size={16} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-1 text-[14px] text-[#9c9c9d] leading-relaxed border-t border-white/[0.02]">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#242728] bg-[#07080a] py-16 px-6 text-[14px] text-[#9c9c9d]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[6px] bg-[#121212] border border-[#242728] flex items-center justify-center text-white">
              <Video size={12} className="text-[#57c1ff]" />
            </div>
            <span className="font-semibold text-white">SyncSpace</span>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-[13px]">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Sign Up</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>

          <div className="text-[12px]">
            &copy; {new Date().getFullYear()} SyncSpace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
