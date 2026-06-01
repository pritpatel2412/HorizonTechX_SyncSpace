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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and app settings.</p>
          </header>

          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Profile Information</h2>
                <p className="text-sm text-muted-foreground mt-1">Your personal details.</p>
              </div>
              
              <div className="p-6 space-y-6">
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-10 bg-surface-2 rounded w-1/2"></div>
                    <div className="h-10 bg-surface-2 rounded w-2/3"></div>
                  </div>
                ) : me ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                        {me.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-lg font-medium">{me.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{me.status}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Full Name</Label>
                        <div className="flex items-center gap-2 font-medium">
                          <User size={16} className="text-muted-foreground" />
                          {me.name}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Email Address</Label>
                        <div className="flex items-center gap-2 font-medium">
                          <Mail size={16} className="text-muted-foreground" />
                          {me.email}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Account Created</Label>
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar size={16} className="text-muted-foreground" />
                          {format(new Date(me.createdAt), 'MMMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">Failed to load profile.</div>
                )}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Appearance</h2>
                <p className="text-sm text-muted-foreground mt-1">Customize how SyncSpace looks.</p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use dark theme across the application. Note: The meeting room is always dark.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun size={16} className="text-muted-foreground" />
                    <Switch 
                      checked={isDark} 
                      onCheckedChange={toggleTheme}
                      data-testid="switch-theme"
                    />
                    <Moon size={16} className="text-primary" />
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
