import { Link } from 'wouter';
import { Video, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Terms() {
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
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-white/40 mb-10">Last updated: June 18, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                By accessing or using SyncSpace, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not access or use our services.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">2. User Accounts</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                When you create an account, you must provide accurate, complete, and current information. You are entirely responsible for safeguarding the credentials you use to access SyncSpace and for any activities or actions performed under your account.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">3. Acceptable Use Policy</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                You agree not to use SyncSpace to upload, share, or broadcast content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable. You may not upload malicious files, exploit routing schemas, or attempt to disable our persistent Socket servers.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">4. Intellectual Property</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                All software, designs, layouts, assets, and code containing the SyncSpace platform remain the sole intellectual property of HorizonTechX. You may not copy, reverse-engineer, or distribute any part of our workspace tools without written permission.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">5. Disclaimer of Liability</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                SyncSpace is provided on an "AS IS" and "AS AVAILABLE" basis. HorizonTechX does not guarantee uninterrupted WebRTC connections, persistent data uploads on temporary files, or faultless AI workspace summaries, and holds no liability for lost session logs.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">6. Modifications to Service</h2>
              <p className="text-white/60 leading-relaxed text-sm">
                We reserve the right to modify, suspend, or terminate the SyncSpace service or any part thereof at any time without notice.
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
