import { Link } from 'wouter';
import { Video, ChevronLeft } from 'lucide-react';

export function Terms() {
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
          <h1 className="text-3xl font-semibold tracking-tight text-[#f4f4f6] mb-2" style={{ fontFeatureSettings: '"calt", "kern", "liga", "ss03"' }}>Terms of Service</h1>
          <p className="text-xs text-[#6a6b6c] mb-10">Last updated: June 18, 2026</p>

          <section className="space-y-8 bg-[#0d0d0d] border border-[#242728] rounded-[10px] p-8">
            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">1. Agreement to Terms</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                By accessing or using SyncSpace, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not access or use our services.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">2. User Accounts</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                When you create an account, you must provide accurate, complete, and current information. You are entirely responsible for safeguarding the credentials you use to access SyncSpace and for any activities or actions performed under your account.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">3. Acceptable Use Policy</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                You agree not to use SyncSpace to upload, share, or broadcast content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable. You may not upload malicious files, exploit routing schemas, or attempt to disable our persistent Socket servers.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">4. Intellectual Property</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                All software, designs, layouts, assets, and code containing the SyncSpace platform remain the sole intellectual property of HorizonTechX. You may not copy, reverse-engineer, or distribute any part of our workspace tools without written permission.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">5. Disclaimer of Liability</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                SyncSpace is provided on an \"AS IS\" and \"AS AVAILABLE\" basis. HorizonTechX does not guarantee uninterrupted WebRTC connections, persistent data uploads on temporary files, or faultless AI workspace summaries, and holds no liability for lost session logs.
              </p>
            </div>

            <div>
              <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-3">6. Modifications to Service</h2>
              <p className="text-[#9c9c9d] leading-relaxed text-sm">
                We reserve the right to modify, suspend, or terminate the SyncSpace service or any part thereof at any time without notice.
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
