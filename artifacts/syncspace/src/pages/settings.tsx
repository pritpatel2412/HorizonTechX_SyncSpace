import { Sidebar } from '@/components/layout/sidebar';
import { useGetMe } from '@workspace/api-client-react';
import { User, Mail, Calendar, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

export function Settings() {
  const { data: me, isLoading } = useGetMe();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="flex h-screen bg-[#07080a] text-[#cdcdcd] overflow-hidden selection:bg-white/10 selection:text-white">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8 bg-[#07080a]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[768px] mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-[#f4f4f6] mb-1" style={{ fontFeatureSettings: '"calt", "kern", "liga", "ss03"' }}>Settings</h1>
            <p className="text-[#9c9c9d] text-sm">Manage your account preferences and app settings.</p>
          </header>

          <div className="space-y-4">
            {/* Profile Information Block */}
            <div className="bg-[#0d0d0d] border border-[#242728] rounded-[10px] overflow-hidden">
              <div className="p-6 border-b border-[#242728] bg-[#101111]">
                <h2 className="text-[16px] font-semibold text-[#f4f4f6]">Profile Information</h2>
                <p className="text-xs text-[#9c9c9d] mt-0.5">Your personal details.</p>
              </div>
              
              <div className="p-6 space-y-6">
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-10 bg-[#101111] rounded-[8px] w-1/2"></div>
                    <div className="h-10 bg-[#101111] rounded-[8px] w-2/3"></div>
                  </div>
                ) : me ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#121212] border border-[#242728] flex items-center justify-center text-[#57c1ff] text-lg font-bold">
                        {me.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[16px] font-medium text-[#f4f4f6]">{me.name}</div>
                        <div className="text-xs text-[#6a6b6c] capitalize">{me.status}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#242728]">
                      <div>
                        <Label className="text-xs text-[#9c9c9d] mb-1 block">Full Name</Label>
                        <div className="flex items-center gap-2 text-[14px] font-medium text-[#f4f4f6]">
                          <User size={15} className="text-[#6a6b6c]" />
                          {me.name}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-[#9c9c9d] mb-1 block">Email Address</Label>
                        <div className="flex items-center gap-2 text-[14px] font-medium text-[#f4f4f6]">
                          <Mail size={15} className="text-[#6a6b6c]" />
                          {me.email}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-[#9c9c9d] mb-1 block">Account Created</Label>
                        <div className="flex items-center gap-2 text-[14px] font-medium text-[#f4f4f6]">
                          <Calendar size={15} className="text-[#6a6b6c]" />
                          {format(new Date(me.createdAt), 'MMMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-[#6a6b6c] text-sm">Failed to load profile.</div>
                )}
              </div>
            </div>

            {/* Appearance Block */}
            <div className="bg-[#0d0d0d] border border-[#242728] rounded-[10px] overflow-hidden">
              <div className="p-6 border-b border-[#242728] bg-[#101111]">
                <h2 className="text-[16px] font-semibold text-[#f4f4f6]">Appearance</h2>
                <p className="text-xs text-[#9c9c9d] mt-0.5">Customize how SyncSpace looks.</p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-medium text-[#f4f4f6]">Dark Mode</Label>
                    <p className="text-xs text-[#9c9c9d] leading-relaxed">
                      Use dark theme across the application. Note: The meeting room is always dark.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sun size={15} className="text-[#6a6b6c]" />
                    <Switch 
                      checked={isDark} 
                      onCheckedChange={toggleTheme}
                      data-testid="switch-theme"
                      className="data-[state=checked]:bg-white data-[state=unchecked]:bg-[#242728]"
                    />
                    <Moon size={15} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </motion.div>
      </div>
    </div>
  );
}
