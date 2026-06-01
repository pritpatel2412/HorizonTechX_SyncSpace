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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
          <header className="mb-10">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to SyncSpace mission control.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <Video size={24} />
                </div>
                <h2 className="text-xl font-semibold mb-2">Start a Meeting</h2>
                <p className="text-muted-foreground mb-6 text-sm">Create a new secure meeting room instantly and invite others to join.</p>
              </div>
              <Button onClick={handleCreateRoom} disabled={createRoom.isPending} className="w-full py-6 text-lg font-medium shadow-md hover:shadow-lg transition-all" data-testid="button-new-meeting">
                <Plus className="mr-2" size={20} />
                {createRoom.isPending ? 'Creating...' : 'New Meeting'}
              </Button>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-foreground mb-4">
                  <Users size={24} />
                </div>
                <h2 className="text-xl font-semibold mb-2">Join a Meeting</h2>
                <p className="text-muted-foreground mb-6 text-sm">Enter a room ID or link to join an existing meeting.</p>
              </div>
              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <Input 
                  placeholder="Enter room ID..." 
                  value={joinRoomId} 
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="flex-1 h-14 bg-surface-2 border-border text-lg px-4"
                  data-testid="input-join-room"
                />
                <Button type="submit" variant="secondary" className="h-14 px-6 bg-surface-2 hover:bg-muted" data-testid="button-join-meeting">
                  <ArrowRight size={20} />
                </Button>
              </form>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock size={20} className="text-muted-foreground" />
              Recent Meetings
            </h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-surface animate-pulse rounded-lg border border-border"></div>
                ))}
              </div>
            ) : history && history.length > 0 ? (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {history.map((room) => (
                    <div key={room.id} className="p-4 flex items-center justify-between hover:bg-surface-2 transition-colors">
                      <div>
                        <p className="font-medium">{room.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{format(new Date(room.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                      </div>
                      <Button variant="outline" onClick={() => setLocation(`/room/${room.roomId}`)} data-testid={`button-rejoin-${room.id}`}>
                        Rejoin
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-10 bg-surface border border-border rounded-xl">
                <p className="text-muted-foreground">No recent meetings found.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
