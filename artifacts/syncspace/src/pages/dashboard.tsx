import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateRoom, useGetRoomHistory } from '@workspace/api-client-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Plus, Clock, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export function Dashboard() {
  const [, setLocation] = useLocation();
  const [joinRoomId, setJoinRoomId] = useState('');
  const createRoom = useCreateRoom();
  const { data: history, isLoading } = useGetRoomHistory();

  const handleCreateRoom = () => {
    createRoom.mutate({ data: { name: 'New Meeting' } }, {
      onSuccess: (room) => {
        setLocation(`/room/${room.roomId}`);
      }
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      setLocation(`/room/${joinRoomId.trim()}`);
    }
  };

  return (
    <div className="flex h-screen bg-[#07080a] text-[#cdcdcd] overflow-hidden selection:bg-white/10 selection:text-white">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8 bg-[#07080a]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1000px] mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-semibold tracking-tight text-[#f4f4f6] mb-1" style={{ fontFeatureSettings: '"calt", "kern", "liga", "ss03"' }}>Dashboard</h1>
            <p className="text-[#9c9c9d] text-sm">Welcome to SyncSpace mission control.</p>
          </header>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {/* Start a Meeting Card */}
            <div className="bg-[#0d0d0d] rounded-[10px] p-6 border border-[#242728] shadow-none flex flex-col justify-between h-[220px]">
              <div>
                <div className="w-10 h-10 rounded-[8px] bg-[#121212] border border-[#242728] flex items-center justify-center text-[#57c1ff] mb-4">
                  <Video size={18} />
                </div>
                <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-1">Start a Meeting</h2>
                <p className="text-[#9c9c9d] text-xs leading-relaxed">Create a new secure meeting room instantly and invite others to join.</p>
              </div>
              <Button 
                onClick={handleCreateRoom} 
                disabled={createRoom.isPending} 
                className="w-full bg-white hover:bg-[#e8e8e8] text-black font-semibold h-10 rounded-[8px] border-0 transition-colors shadow-none" 
                data-testid="button-new-meeting"
              >
                <Plus className="mr-1.5" size={16} />
                {createRoom.isPending ? 'Creating...' : 'New Meeting'}
              </Button>
            </div>

            {/* Join a Meeting Card */}
            <div className="bg-[#0d0d0d] rounded-[10px] p-6 border border-[#242728] shadow-none flex flex-col justify-between h-[220px]">
              <div>
                <div className="w-10 h-10 rounded-[8px] bg-[#121212] border border-[#242728] flex items-center justify-center text-[#59d499] mb-4">
                  <Users size={18} />
                </div>
                <h2 className="text-[18px] font-medium text-[#f4f4f6] mb-1">Join a Meeting</h2>
                <p className="text-[#9c9c9d] text-xs leading-relaxed">Enter a room ID or link to join an existing meeting.</p>
              </div>
              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <Input 
                  placeholder="Enter room ID..." 
                  value={joinRoomId} 
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="flex-1 h-10 bg-[#101111] border-[#242728] text-white placeholder-[#6a6b6c] focus:border-[#cdcdcd] focus:ring-0 text-[14px] px-3.5 rounded-[8px]"
                  data-testid="input-join-room"
                />
                <Button 
                  type="submit" 
                  className="h-10 px-4 bg-[#101111] hover:bg-white/[0.05] border border-[#242728] text-white transition-colors rounded-[8px] shadow-none" 
                  data-testid="button-join-meeting"
                >
                  <ArrowRight size={16} />
                </Button>
              </form>
            </div>
          </div>

          {/* Recent Meetings */}
          <div>
            <h3 className="text-[15px] font-semibold text-[#f4f4f6] mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[#9c9c9d]" />
              Recent Meetings
            </h3>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-[#0d0d0d] border border-[#242728] rounded-[10px] animate-pulse"></div>
                ))}
              </div>
            ) : history && history.length > 0 ? (
              <div className="bg-[#0d0d0d] border border-[#242728] rounded-[10px] overflow-hidden">
                <div className="divide-y divide-[#242728]">
                  {history.map((room) => (
                    <div key={room.id} className="p-4 flex items-center justify-between hover:bg-[#121212] transition-colors cursor-pointer group">
                      <div>
                        <p className="text-[14px] font-medium text-[#f4f4f6]">{room.name}</p>
                        <p className="text-xs text-[#6a6b6c] mt-0.5">{format(new Date(room.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setLocation(`/room/${room.roomId}`)} 
                        className="bg-[#101111] hover:bg-white/[0.05] text-[#cdcdcd] hover:text-white border border-[#242728] h-8 px-3.5 text-xs font-semibold rounded-[8px] shadow-none transition-colors" 
                        data-testid={`button-rejoin-${room.id}`}
                      >
                        Rejoin
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-10 bg-[#0d0d0d] border border-[#242728] rounded-[10px]">
                <p className="text-sm text-[#6a6b6c]">No recent meetings found.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
