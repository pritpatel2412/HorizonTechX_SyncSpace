import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useLogin } from '@workspace/api-client-react';
import { useAuthStore } from '@/store';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (token) {
      setLocation('/dashboard');
    }
  }, [token, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { email, password } }, {
      onSuccess: (resp) => {
        setToken(resp.token);
        setUser(resp.user);
        setLocation('/dashboard');
      },
      onError: () => {
        toast.error('Invalid credentials');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-[#cdcdcd] flex flex-col justify-center items-center p-4 selection:bg-white/10 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-[8px] bg-[#121212] border border-[#242728] flex items-center justify-center text-white mb-4">
            <Video size={18} className="text-[#57c1ff]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f4f4f6]">Welcome back</h1>
          <p className="text-[#9c9c9d] text-sm mt-1">Sign in to your SyncSpace account</p>
        </div>

        {/* Raycast style card box */}
        <div className="bg-[#0d0d0d] border border-[#242728] rounded-[10px] p-6 shadow-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[#f4f4f6]">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="bg-[#101111] border-[#242728] text-[#f4f4f6] placeholder-[#6a6b6c] focus:border-[#cdcdcd] focus:ring-0 h-9 rounded-[8px]"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-[#f4f4f6]">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="bg-[#101111] border-[#242728] text-[#f4f4f6] placeholder-[#6a6b6c] focus:border-[#cdcdcd] focus:ring-0 h-9 rounded-[8px]"
                data-testid="input-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-white hover:bg-[#e8e8e8] text-black font-semibold h-9 rounded-[8px] border-0 transition-colors mt-6 shadow-none" 
              disabled={login.isPending}
              data-testid="button-submit-login"
            >
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-xs text-[#9c9c9d]">
            Don't have an account?{' '}
            <Link href="/register" className="text-white hover:underline font-medium" data-testid="link-register">
              Sign up
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
