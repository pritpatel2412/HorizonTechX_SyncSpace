import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store';
import { useGetRoom, useAiSummarize, useAiAsk } from '@workspace/api-client-react';
import { toast } from 'react-hot-toast';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Hand, MessageSquare, Layout, PhoneOff, Copy, Users,
  Crown, Send, Paperclip, X, ChevronRight, Brain, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface PeerConnection {
  peerId: string;
  peer: Peer.Instance;
  stream?: MediaStream;
  userName: string;
  userId: number;
}

interface ChatMessage {
  id: string;
  message: string;
  userName: string;
  userId: number;
  timestamp: string;
}

interface RoomParticipant {
  socketId: string;
  userId: number;
  userName: string;
}

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { data: roomData } = useGetRoom(roomId ?? '', {
    query: { enabled: !!roomId, queryKey: ['room', roomId] },
  });

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [screenSharer, setScreenSharer] = useState<{ userId: number; userName: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTime = useRef(Date.now());

  const aiSummarize = useAiSummarize();
  const aiAsk = useAiAsk();

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const createPeer = useCallback((targetSocketId: string, stream: MediaStream, initiator: boolean, userName: string, userId: number, incomingSignal?: unknown): PeerConnection => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    if (!initiator && incomingSignal) {
      peer.signal(incomingSignal as Peer.SignalData);
    }

    peer.on('signal', (signal) => {
      if (initiator) {
        socketRef.current?.emit('send-signal', {
          to: targetSocketId,
          signal,
          from: socketRef.current.id,
          userName: user?.name ?? 'Guest',
        });
      } else {
        socketRef.current?.emit('return-signal', {
          to: targetSocketId,
          signal,
          callerID: targetSocketId,
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      setPeers((prev) => prev.map((p) => p.peerId === targetSocketId ? { ...p, stream: remoteStream } : p));
    });

    peer.on('error', (err) => {
      console.warn('Peer error', err);
    });

    peer.on('close', () => {
      peersRef.current.delete(targetSocketId);
      setPeers((prev) => prev.filter((p) => p.peerId !== targetSocketId));
    });

    return { peerId: targetSocketId, peer, userName, userId };
  }, [user]);

  useEffect(() => {
    if (!roomId || !token) return;

    let mounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const socket = io(window.location.origin, { auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnected(true);
          socket.emit('join-room', roomId, user?.id ?? 0, user?.name ?? 'Guest');
        });

        socket.on('all-users', (users: RoomParticipant[]) => {
          setParticipants(users);
          users.forEach((u) => {
            if (u.socketId === socket.id) return;
            const conn = createPeer(u.socketId, stream, true, u.userName, u.userId);
            peersRef.current.set(u.socketId, conn);
            setPeers((prev) => [...prev, conn]);
          });
        });

        socket.on('user-joined', ({ signal, callerID, userName }: { signal: unknown; callerID: string; userName: string }) => {
          if (peersRef.current.has(callerID)) return;
          const conn = createPeer(callerID, stream, false, userName, 0, signal);
          peersRef.current.set(callerID, conn);
          setPeers((prev) => [...prev, conn]);
        });

        socket.on('receiving-returned-signal', ({ id, signal }: { id: string; signal: unknown }) => {
          peersRef.current.get(id)?.peer.signal(signal as Peer.SignalData);
        });

        socket.on('user-joined-notify', ({ userName }: { userName: string }) => {
          toast(`${userName} joined the meeting`, { icon: '👋', duration: 3000 });
        });

        socket.on('user-left', ({ socketId }: { socketId: string }) => {
          const conn = peersRef.current.get(socketId);
          if (conn) {
            conn.peer.destroy();
            peersRef.current.delete(socketId);
            setPeers((prev) => prev.filter((p) => p.peerId !== socketId));
          }
        });

        socket.on('receive-message', (msg: ChatMessage) => {
          setChatMessages((prev) => [...prev, msg]);
        });

        socket.on('hand-raised', ({ userName }: { userName: string }) => {
          toast(`${userName} raised their hand`, { icon: '✋', duration: 4000 });
        });

        socket.on('screen-sharing', ({ userName }: { userName: string; userId: number }) => {
          setScreenSharer({ userId: 0, userName });
          toast(`${userName} started screen sharing`);
        });

        socket.on('screen-share-ended', () => {
          setScreenSharer(null);
        });

      } catch (err) {
        if (!mounted) return;
        toast.error('Could not access camera/microphone');
        console.warn('Media error:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      socketRef.current?.emit('leave-room', roomId);
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((c) => c.peer.destroy());
      peersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoOff((v) => !v);
  };

  const toggleScreenShare = async () => {
    if (isSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsSharing(false);
      socketRef.current?.emit('screen-share-stop', { roomId });
      // Switch back to camera for all peers
      const camStream = localStreamRef.current;
      if (camStream) {
        peersRef.current.forEach(({ peer }) => {
          const videoTrack = camStream.getVideoTracks()[0];
          if (videoTrack) {
            const sender = (peer as unknown as { _pc: RTCPeerConnection })._pc
              ?.getSenders()
              ?.find((s) => s.track?.kind === 'video');
            sender?.replaceTrack(videoTrack);
          }
        });
      }
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setScreenStream(display);
      setIsSharing(true);
      socketRef.current?.emit('screen-share-start', { roomId, userId: user?.id, userName: user?.name });
      display.getTracks()[0].onended = () => toggleScreenShare();
    } catch {
      toast.error('Screen sharing not available');
    }
  };

  const raiseHand = () => {
    if (!handRaised) {
      socketRef.current?.emit('hand-raise', { roomId, userId: user?.id, userName: user?.name });
      toast('Hand raised!', { icon: '✋' });
    }
    setHandRaised((h) => !h);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat-message', {
      roomId,
      message: chatInput.trim(),
      userName: user?.name ?? 'Guest',
      userId: user?.id ?? 0,
      timestamp: new Date().toISOString(),
    });
    setChatInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }

    const formData = new FormData();
    formData.append('file', file);
    if (roomId) formData.append('roomId', roomId);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.fileId) {
        socketRef.current?.emit('chat-message', {
          roomId,
          message: `📎 Shared a file: [${file.name}](/api/files/${data.fileId})`,
          userName: user?.name ?? 'Guest',
          userId: user?.id ?? 0,
          timestamp: new Date().toISOString(),
        });
        toast.success('File shared!');
      }
    } catch {
      toast.error('Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const leaveRoom = () => {
    socketRef.current?.emit('leave-room', roomId);
    setLocation('/');
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    toast.success('Room link copied!');
  };

  const handleAiAsk = () => {
    if (!aiInput.trim()) return;
    aiAsk.mutate(
      { data: { question: aiInput, context: chatMessages.map((m) => `${m.userName}: ${m.message}`).join('\n') } },
      { onSuccess: (r) => setAiResponse(r.result), onError: () => toast.error('AI unavailable') }
    );
    setAiInput('');
  };

  const handleSummarize = () => {
    const msgs = chatMessages.map((m) => `${m.userName}: ${m.message}`);
    aiSummarize.mutate(
      { data: { messages: msgs, roomId } },
      { onSuccess: (r) => setAiResponse(r.result), onError: () => toast.error('AI unavailable') }
    );
  };

  const allVideoSources = [
    { peerId: 'local', stream: localStreamRef.current, userName: user?.name ?? 'You', isLocal: true },
    ...peers.map((p) => ({ peerId: p.peerId, stream: p.stream, userName: p.userName, isLocal: false })),
  ];

  const gridCols = allVideoSources.length <= 1 ? 'grid-cols-1' : allVideoSources.length <= 2 ? 'grid-cols-2' : allVideoSources.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="dark flex h-screen bg-[#0F1117] text-[#E2E8F0] overflow-hidden font-sans">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center text-white">
              <Video size={14} />
            </div>
            <span className="font-semibold text-sm text-white/90">SyncSpace</span>
            <span className="text-white/30 text-sm">|</span>
            <span className="text-white/60 text-sm truncate max-w-xs">{roomData?.name ?? roomId}</span>
          </div>
          <div className="flex items-center gap-3">
            {screenSharer && (
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                {screenSharer.userName} is sharing
              </span>
            )}
            <span className="text-white/40 font-mono text-sm" data-testid="text-meeting-timer">{formatTime(elapsed)}</span>
            {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={copyRoomLink} className="text-white/40 hover:text-white/80 transition-colors p-1.5 rounded hover:bg-white/5" data-testid="button-copy-link">
                  <Copy size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy room link</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Video grid */}
        <div className="flex-1 p-3 overflow-hidden">
          <div className={`grid ${gridCols} gap-3 h-full`}>
            {allVideoSources.slice(0, 8).map(({ peerId, stream, userName, isLocal }) => (
              <VideoTile
                key={peerId}
                stream={stream}
                userName={userName}
                isLocal={isLocal}
                isMuted={isLocal && isMuted}
                isVideoOff={isLocal && isVideoOff}
                localVideoRef={isLocal ? localVideoRef : undefined}
              />
            ))}
          </div>
        </div>

        {/* Controls bar */}
        <div className="h-20 flex items-center justify-center shrink-0 pb-2">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-2 bg-[#1A1D2E]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl"
          >
            <ControlBtn
              active={!isMuted}
              onClick={toggleMute}
              icon={isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              label={isMuted ? 'Unmute' : 'Mute'}
              testId="button-toggle-mic"
            />
            <ControlBtn
              active={!isVideoOff}
              onClick={toggleVideo}
              icon={isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
              label={isVideoOff ? 'Start video' : 'Stop video'}
              testId="button-toggle-video"
            />
            <ControlBtn
              active={isSharing}
              onClick={toggleScreenShare}
              icon={isSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              label={isSharing ? 'Stop sharing' : 'Share screen'}
              testId="button-screen-share"
            />
            <ControlBtn
              active={handRaised}
              onClick={raiseHand}
              icon={<Hand size={18} />}
              label="Raise hand"
              testId="button-raise-hand"
            />
            <div className="w-px h-6 bg-white/10 mx-1" />
            <ControlBtn
              active={showChat}
              onClick={() => { setShowChat((c) => !c); setShowParticipants(false); setShowAI(false); }}
              icon={<MessageSquare size={18} />}
              label="Chat"
              badge={chatMessages.length > 0 ? chatMessages.length : undefined}
              testId="button-toggle-chat"
            />
            <ControlBtn
              active={showParticipants}
              onClick={() => { setShowParticipants((p) => !p); setShowChat(false); setShowAI(false); }}
              icon={<Users size={18} />}
              label="Participants"
              testId="button-toggle-participants"
            />
            <ControlBtn
              active={showWhiteboard}
              onClick={() => setShowWhiteboard((w) => !w)}
              icon={<Layout size={18} />}
              label="Whiteboard"
              testId="button-toggle-whiteboard"
            />
            <ControlBtn
              active={showAI}
              onClick={() => { setShowAI((a) => !a); setShowChat(false); setShowParticipants(false); }}
              icon={<Brain size={18} />}
              label="AI Assistant"
              testId="button-toggle-ai"
            />
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all font-medium text-sm"
              data-testid="button-leave-call"
            >
              <PhoneOff size={16} />
              Leave
            </button>
          </motion.div>
        </div>
      </div>

      {/* Sidebars */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            key="chat"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 bg-[#1A1D2E] border-l border-white/10 flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Meeting Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white/80"><X size={16} /></button>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-bold">
                        {msg.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-white/80">{msg.userName}</span>
                      <span className="text-xs text-white/30">{format(new Date(msg.timestamp), 'h:mm a')}</span>
                    </div>
                    <div className="ml-8 text-sm text-white/70 bg-white/5 rounded-lg px-3 py-2 leading-relaxed break-words">
                      {msg.message.includes('/api/files/') ? (
                        <span dangerouslySetInnerHTML={{ __html: msg.message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-400 underline">$1</a>') }} />
                      ) : msg.message}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-white/10">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.zip,.txt"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors"
                  data-testid="button-attach-file"
                >
                  <Paperclip size={16} />
                </button>
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9"
                  data-testid="input-chat-message"
                />
                <button
                  type="submit"
                  className="p-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                  data-testid="button-send-message"
                >
                  <Send size={14} className="text-white" />
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {showParticipants && (
          <motion.div
            key="participants"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-72 bg-[#1A1D2E] border-l border-white/10 flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Participants ({allVideoSources.length})</h3>
              <button onClick={() => setShowParticipants(false)} className="text-white/40 hover:text-white/80"><X size={16} /></button>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {allVideoSources.map(({ peerId, userName, isLocal }) => (
                  <div key={peerId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white/80 flex-1">{userName}{isLocal ? ' (You)' : ''}</span>
                    {roomData?.hostId === user?.id && !isLocal && (
                      <Crown size={14} className="text-yellow-400" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}

        {showAI && (
          <motion.div
            key="ai"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 bg-[#1A1D2E] border-l border-white/10 flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-indigo-400" />
                <h3 className="font-semibold text-sm">AI Assistant</h3>
              </div>
              <button onClick={() => setShowAI(false)} className="text-white/40 hover:text-white/80"><X size={16} /></button>
            </div>
            <div className="p-4 flex flex-col gap-3 flex-1 overflow-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSummarize}
                disabled={aiSummarize.isPending || chatMessages.length === 0}
                className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10 w-full"
                data-testid="button-ai-summarize"
              >
                {aiSummarize.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Summarize Meeting
              </Button>
              {aiResponse && (
                <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70 leading-relaxed whitespace-pre-wrap max-h-64 overflow-auto" data-testid="text-ai-response">
                  {aiResponse}
                </div>
              )}
              <div className="mt-auto">
                <p className="text-xs text-white/30 mb-2">Ask the AI a question</p>
                <div className="flex gap-2">
                  <Input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAiAsk(); }}
                    data-testid="input-ai-question"
                  />
                  <button
                    onClick={handleAiAsk}
                    disabled={aiAsk.isPending}
                    className="p-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                    data-testid="button-ai-ask"
                  >
                    {aiAsk.isPending ? <Loader2 size={14} className="animate-spin text-white" /> : <ChevronRight size={14} className="text-white" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Whiteboard iframe overlay */}
      <AnimatePresence>
        {showWhiteboard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="fixed inset-0 z-50 bg-[#0F1117]/95 backdrop-blur flex flex-col"
          >
            <div className="h-12 flex items-center justify-between px-4 border-b border-white/10">
              <span className="font-semibold text-sm">Whiteboard</span>
              <button onClick={() => setShowWhiteboard(false)} className="text-white/40 hover:text-white/80 p-2"><X size={16} /></button>
            </div>
            <div className="flex-1">
              <WhiteboardEmbed roomId={roomId ?? ''} token={token ?? ''} socket={socketRef.current} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function VideoTile({ stream, userName, isLocal, isMuted, isVideoOff, localVideoRef }: {
  stream?: MediaStream | null;
  userName: string;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ref = localVideoRef ?? videoRef;

  useEffect(() => {
    if (!isLocal && stream && ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream, isLocal, ref]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#1A1D2E] border border-white/10 aspect-video flex items-center justify-center group">
      {isVideoOff || (!stream && !isLocal) ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-300">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-white/40">{userName}</span>
        </div>
      ) : (
        <video
          ref={ref}
          autoPlay
          muted={isLocal}
          playsInline
          className="w-full h-full object-cover"
        />
      )}
      {/* Name badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1">
        {isMuted && <MicOff size={11} className="text-red-400" />}
        <span className="text-xs text-white font-medium">{isLocal ? `${userName} (You)` : userName}</span>
      </div>
    </div>
  );
}

function ControlBtn({ active, onClick, icon, label, badge, testId }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  testId: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`relative p-2.5 rounded-xl transition-all ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'}`}
          data-testid={testId}
        >
          {icon}
          {badge !== undefined && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function WhiteboardEmbed({ roomId, token, socket }: { roomId: string; token: string; socket: Socket | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<unknown>(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    let canvas: unknown;
    const initFabric = async () => {
      const fabricModule = await import('fabric');
      const FabricCanvas = fabricModule.Canvas as unknown as new (el: HTMLCanvasElement, opts: object) => unknown;
      const el = canvasRef.current;
      if (!el) return;
      canvas = new FabricCanvas(el, {
        isDrawingMode: true,
        width: el.parentElement?.clientWidth ?? 800,
        height: el.parentElement?.clientHeight ?? 500,
        backgroundColor: '#0F1117',
      });
      fabricRef.current = canvas;

      let debounceTimer: ReturnType<typeof setTimeout>;
      (canvas as { on: (event: string, cb: () => void) => void }).on('object:modified', () => {
        if (isRemoteUpdate.current) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const json = JSON.stringify((canvas as { toJSON: () => unknown }).toJSON());
          socket?.emit('whiteboard-update', { roomId, canvasJSON: json });
        }, 100);
      });
      (canvas as { on: (event: string, cb: () => void) => void }).on('path:created', () => {
        if (isRemoteUpdate.current) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const json = JSON.stringify((canvas as { toJSON: () => unknown }).toJSON());
          socket?.emit('whiteboard-update', { roomId, canvasJSON: json });
        }, 100);
      });
    };

    initFabric();

    if (socket) {
      socket.on('whiteboard-state', ({ canvasJSON }: { canvasJSON: string }) => {
        if (!fabricRef.current) return;
        isRemoteUpdate.current = true;
        (fabricRef.current as { loadFromJSON: (json: string, cb: () => void) => void })
          .loadFromJSON(canvasJSON, () => {
            (fabricRef.current as { renderAll: () => void }).renderAll();
            isRemoteUpdate.current = false;
          });
      });
    }

    return () => {
      if (canvas) (canvas as { dispose: () => void }).dispose();
      socket?.off('whiteboard-state');
    };
  }, [roomId, socket]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0F1117]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
