import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store';
import { 
  Video, Layout, Folder, Brain, Shield, ArrowRight, 
  Check, Copy, HelpCircle, ChevronDown, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function Landing() {
  const [, setLocation] = useLocation();
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
      icon: <Video className="text-indigo-400" size={24} />,
      title: "HD Video & Voice",
      description: "Low-latency WebRTC video conferencing with active speaker detection and direct peer connection."
    },
    {
      icon: <Layout className="text-purple-400" size={24} />,
      title: "Interactive Whiteboard",
      description: "Collaborate in real-time with an infinite whiteboard featuring shapes, pens, text, and instant state sync."
    },
    {
      icon: <Folder className="text-cyan-400" size={24} />,
      title: "Workspace File Sharing",
      description: "Securely upload and share documents, images, and archives directly inside your workspaces."
    },
    {
      icon: <Brain className="text-pink-400" size={24} />,
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
    <div className="min-h-screen bg-[#0B0D17] text-[#E2E8F0] overflow-x-hidden font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-black/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Video size={16} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">SyncSpace</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            {token ? (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5">
                <Link href="/dashboard">Go to Workspace</Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 shadow-lg shadow-indigo-500/20">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-xs font-semibold text-indigo-300 mb-6"
        >
          <Sparkles size={12} /> Real-time team collaboration reborn
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.1] mb-8"
        >
          The complete hub for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
            modern remote teams
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed mb-10"
        >
          SyncSpace combines high-definition meetings, real-time interactive whiteboards, secure file repositories, and smart AI support into a single premium workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-6 rounded-xl shadow-xl shadow-indigo-500/20 text-base">
            <Link href={token ? "/dashboard" : "/register"}>
              {token ? "Open Workspace" : "Get Started Free"} <ArrowRight className="ml-2" size={18} />
            </Link>
          </Button>
          <a href="#features">
            <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/[0.03] text-white font-medium px-8 py-6 rounded-xl text-base">
              Learn More
            </Button>
          </a>
        </motion.div>

        {/* Hero Interactive Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 w-full max-w-5xl rounded-2xl bg-white/[0.01] border border-white/[0.06] p-4 shadow-2xl relative"
        >
          <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-3xl -z-10" />
          <div className="bg-[#101222] rounded-xl border border-white/[0.04] aspect-[16/9] overflow-hidden flex flex-col shadow-inner">
            {/* Mock Header */}
            <div className="h-12 border-b border-white/[0.05] px-4 flex items-center justify-between text-xs text-white/40">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]/60" />
                <span className="ml-4 text-white/60 font-semibold">SyncSpace Call: Marketing Alignment</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-medium">Active Call</span>
                <span className="font-mono">14:32</span>
              </div>
            </div>
            
            {/* Mock Grid */}
            <div className="flex-1 p-4 grid grid-cols-3 gap-4 bg-[#0E101D]">
              <div className="col-span-2 rounded-lg border border-white/[0.04] bg-white/[0.01] overflow-hidden flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 to-indigo-900/10" />
                <Layout size={64} className="opacity-10 text-indigo-400 group-hover:scale-105 transition-transform" />
                <span className="absolute bottom-3 left-3 text-xs bg-black/40 px-2.5 py-1 rounded backdrop-blur-sm">Collaborative Whiteboard</span>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex-1 rounded-lg border border-white/[0.04] bg-white/[0.01] overflow-hidden flex items-center justify-center relative">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">JD</div>
                  <span className="absolute bottom-2 left-2 text-[10px] bg-black/40 px-2 py-0.5 rounded">Jane Doe</span>
                </div>
                <div className="flex-1 rounded-lg border border-white/[0.04] bg-white/[0.01] overflow-hidden flex items-center justify-center relative">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">AS</div>
                  <span className="absolute bottom-2 left-2 text-[10px] bg-black/40 px-2 py-0.5 rounded">Alex Smith</span>
                </div>
              </div>
            </div>

            {/* Mock Control */}
            <div className="h-16 border-t border-white/[0.05] bg-[#121426] px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-24 h-8 rounded-lg border border-white/[0.05] bg-white/[0.02] flex items-center justify-between px-2 cursor-pointer hover:bg-white/[0.05]" onClick={handleCopyLink}>
                  <span className="text-[10px] text-white/50 truncate">Copy invite link</span>
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white/40" />}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center"><Check size={16} /></div>
                <div className="w-10 h-10 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center text-red-400"><Video size={16} /></div>
              </div>

              <div className="w-24 flex justify-end">
                <span className="text-[10px] text-white/40">3 participants</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 border-t border-white/[0.04] bg-white/[0.01] relative px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">A unified space for your projects</h2>
            <p className="text-white/50 max-w-xl mx-auto">Everything you need to collaborate with your remote team in one high-performance interface.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div 
                key={i} 
                className="bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-4px] shadow-lg group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-3xl -z-10" />
          <div className="bg-[#101222]/60 rounded-2xl border border-white/[0.05] p-8">
            <div className="space-y-6">
              {[
                "JWT Token secured sessions and channels",
                "Direct WebRTC video mesh with STUN configuration",
                "Clean database migrations using Drizzle ORM and Neon cloud",
                "Granular file restrictions (PNG, JPG, PDF, XLSX, ZIP up to 10MB)"
              ].map((text, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={14} />
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-xs font-semibold text-cyan-300 mb-6">
            <Shield size={12} /> Enterprise-grade security
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">Designed with privacy & speed first</h2>
          <p className="text-white/50 leading-relaxed mb-6">
            SyncSpace runs on modern, secure peer architecture. Your data is protected by industry standard encryption models, and meeting logs are stored securely in a dedicated private cloud database.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-white/[0.04] bg-[#090A13] px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-xs font-semibold text-purple-300 mb-6">
              <HelpCircle size={12} /> Common Questions
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => {
              const isOpen = faqOpen === i;
              return (
                <div 
                  key={i} 
                  className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden transition-colors duration-200"
                >
                  <button 
                    onClick={() => toggleFaq(i)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-medium text-white hover:text-indigo-300 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                        <div className="px-6 pb-5 pt-1 text-sm text-white/50 leading-relaxed border-t border-white/[0.02]">
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
      <footer className="border-t border-white/[0.05] bg-[#07080F] py-16 px-6 text-sm text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-white">
              <Video size={12} />
            </div>
            <span className="font-bold text-white text-base">SyncSpace</span>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Sign Up</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} SyncSpace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
