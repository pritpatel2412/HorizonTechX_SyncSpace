import { Link } from 'wouter';
import { Video, ChevronLeft } from 'lucide-react';

export function Privacy() {
  return (
    <div className="min-h-screen bg-[#0B0D17] text-[#E2E8F0] font-sans overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-black/10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <ChevronLeft size={16} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-white">
              <Video size={12} />
            </div>
            <span className="font-bold text-white text-sm">SyncSpace</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-white/40 mb-10">Last updated: June 18, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                We collect essential data to run SyncSpace securely, including your email, name, and encrypted credentials when registering. We also hold temporary room identifiers, meeting chat log history, and whiteboard state arrays strictly to provide service functionality.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Information</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                Your credentials are used to authenticate your session logs. Video and voice data run over decentralized peer connections via WebRTC and are not recorded on our servers. File attachments are temporarily hosted for download purposes and are restricted to authorized room participants.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">3. Data Sharing & Third-Parties</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                We do not sell, rent, or distribute user data. If enabled, text chat data is passed securely to our Groq LLM endpoint solely to generate real-time AI summaries and answer room assistant questions.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">4. Cookies & Session Storage</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                SyncSpace utilizes HTML5 local storage to persist your authorized JWT token key between sessions. We do not place marketing cookies or track external browser activity.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Deletion Requests</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                Users can request full deletion of their history and profile information. All room logs, uploaded assets, and credentials will be permanently removed from our PostgreSQL database upon account deletion.
              </p>
            </div>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-[#07080F] py-8 text-center text-xs text-white/30">
        &copy; {new Date().getFullYear()} SyncSpace. All rights reserved.
      </footer>
    </div>
  );
}
