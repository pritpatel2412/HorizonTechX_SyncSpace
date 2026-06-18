import { Link, useLocation } from 'wouter';
import { Home, Folder, Settings, Video, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store';

export function Sidebar() {
  const [location] = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/files', label: 'Files', icon: Folder },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-surface border-r border-border h-full flex flex-col hidden md:flex text-text">
      <div className="p-6 border-b border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
          <Video size={18} />
        </div>
        <span className="font-semibold text-lg tracking-tight">SyncSpace</span>
      </div>
      <div className="flex-1 py-4 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'}`} data-testid={`link-sidebar-${item.label.toLowerCase()}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-border">
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors w-full text-left text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid="button-sidebar-logout">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
