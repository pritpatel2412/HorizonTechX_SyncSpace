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
    <div className="w-64 bg-[#07080a] border-r border-[#242728] h-full flex flex-col hidden md:flex text-[#cdcdcd] selection:bg-white/10 selection:text-white">
      {/* Brand header */}
      <div className="h-14 px-6 border-b border-[#242728] flex items-center gap-3 bg-[#07080a] shrink-0">
        <div className="w-7 h-7 rounded-[6px] bg-[#121212] border border-[#242728] flex items-center justify-center text-white">
          <Video size={14} className="text-[#57c1ff]" />
        </div>
        <span className="font-semibold text-[15px] tracking-tight text-[#f4f4f6]">SyncSpace</span>
      </div>

      {/* Nav items list */}
      <div className="flex-1 py-4 flex flex-col gap-0.5 px-3">
        {navItems.map((item) => {
          const active = location === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                active 
                  ? 'bg-[#101111] text-[#f4f4f6]' 
                  : 'text-[#9c9c9d] hover:bg-[#121212] hover:text-[#f4f4f6]'
              }`}
              data-testid={`link-sidebar-${item.label.toLowerCase()}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout button */}
      <div className="p-4 border-t border-[#242728]">
        <button 
          onClick={logout} 
          className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors w-full text-left text-[#9c9c9d] hover:bg-[#ff6161]/15 hover:text-[#ff6161]" 
          data-testid="button-sidebar-logout"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
