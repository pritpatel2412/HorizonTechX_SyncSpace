import { Link } from 'wouter';
import { Video, ChevronLeft } from 'lucide-react';

export function Privacy() {
  return (
    <div className="min-h-screen bg-[#07080a] text-[#cdcdcd] font-sans overflow-x-hidden selection:bg-white/10 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#242728] bg-[#07080a] h-14 flex items-center">
        <div className="max-w-[768px] w-full mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-[#9c9c9d] hover:text-[#f4f4f6] transition-colors text-sm font-medium">
            <ChevronLeft size={16} />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[6px] bg-[#121212] border border-[#242728] flex items-center justify-center text-white">
              <Video size={12} className="text-[#57c1ff]" />
            </div>
            <span className="font-semibold text-white text-sm">SyncSpace</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[768px] mx-auto px-6 py-16">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-[#f4f4f6] mb-2" style={{ fontFeatureSettings: '"calt", "kern", "liga", "ss03"' }}>Privacy Policy</h1>
          <p className="text-xs text-[#6a6b6c] mb-10">Last updated: June 18, 2026</p>

          <section className="space-y-8 bg-[#0d0d0d] border border-[#242728] rounded-[10px] p-8">
            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">1. Information We Collect</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                We collect essential data to run SyncSpace securely, including your email, name, and encrypted credentials when registering. We also hold temporary room identifiers, meeting chat log history, and whiteboard state arrays strictly to provide service functionality.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">2. How We Use Information</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                Your credentials are used to authenticate your session logs. Video and voice data run over decentralized peer connections via WebRTC and are not recorded on our servers. File attachments are temporarily hosted for download purposes and are restricted to authorized room participants.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">3. Data Sharing & Third-Parties</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                We do not sell, rent, or distribute user data. If enabled, text chat data is passed securely to our Groq LLM endpoint solely to generate real-time AI summaries and answer room assistant questions.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">4. Cookies & Session Storage</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                SyncSpace utilizes HTML5 local storage to persist your authorized JWT token key between sessions. We do not place marketing cookies or track external browser activity.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">5. Data Deletion Requests</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                Users can request full deletion of their history and profile information. All room logs, uploaded assets, and credentials will be permanently removed from our PostgreSQL database upon account deletion.
              </p>
            </div>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#242728] bg-[#07080F] py-8 text-center text-xs text-[#6a6b6c]">
        &copy; {new Date().getFullYear()} SyncSpace. All rights reserved.
      </footer>
    </div>
  );
}
