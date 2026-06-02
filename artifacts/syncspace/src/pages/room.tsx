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
  Pen, Square, Circle, Minus, Type, Eraser,
  Undo2, Redo2, Trash2, Download,
  FileText, Maximize2, Minimize2,
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState<Date | null>(null);

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

        // Active speaker — remote peers
        socket.on('speaker-changed', ({ userId, active }: { userId: number; active: boolean }) => {
          setSpeakingUsers((prev) => {
            const s = new Set(prev);
            const entry = [...peersRef.current.entries()].find(([, p]) => p.userId === userId);
            if (entry) { if (active) s.add(entry[0]); else s.delete(entry[0]); }
            return s;
          });
        });

        // Collaborative notes
        socket.on('notes-state', ({ notes: incoming }: { notes: string }) => {
          setNotes(incoming);
          setNotesSaved(new Date());
        });

        // Web Audio API — detect local speaking and broadcast it
        try {
          const ACtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new ACtx();
          audioCtxRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          audioCtx.createMediaStreamSource(stream).connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          let prevSpeaking = false;
          let silenceCount = 0;

          const tick = () => {
            if (!mounted) return;
            analyser.getByteFrequencyData(data);
            const avg = data.slice(0, 20).reduce((a: number, b: number) => a + b, 0) / 20;
            const isSpeakingNow = avg > 18;

            if (isSpeakingNow && !prevSpeaking) {
              prevSpeaking = true;
              silenceCount = 0;
              socket.emit('speaking-active', { roomId, userId: user?.id ?? 0, active: true });
              setSpeakingUsers((s) => new Set([...s, 'local']));
            } else if (!isSpeakingNow && prevSpeaking) {
              silenceCount++;
              if (silenceCount > 18) { // ~300 ms buffer before marking silent
                prevSpeaking = false;
                socket.emit('speaking-active', { roomId, userId: user?.id ?? 0, active: false });
                setSpeakingUsers((s) => { const n = new Set(s); n.delete('local'); return n; });
              }
            } else if (isSpeakingNow) {
              silenceCount = 0;
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        } catch {
          // AudioContext unavailable (e.g. no mic granted yet) — skip detection
        }

      } catch (err) {
        if (!mounted) return;
        toast.error('Could not access camera/microphone');
        console.warn('Media error:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
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

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      socketRef.current?.emit('notes-update', { roomId, notes: val });
      setNotesSaved(new Date());
    }, 500);
  };

  const allVideoSources = [
    { peerId: 'local', stream: localStreamRef.current, userName: user?.name ?? 'You', isLocal: true },
    ...peers.map((p) => ({ peerId: p.peerId, stream: p.stream, userName: p.userName, isLocal: false })),
  ];

  const pinnedSource = pinnedPeerId ? allVideoSources.find((s) => s.peerId === pinnedPeerId) ?? null : null;
  const unpinnedSources = pinnedPeerId ? allVideoSources.filter((s) => s.peerId !== pinnedPeerId) : [];

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
          {pinnedSource ? (
            /* Spotlight layout — pinned tile + strip of others */
            <div className="flex gap-3 h-full">
              <div className="flex-1 min-w-0">
                <VideoTile
                  stream={pinnedSource.stream}
                  userName={pinnedSource.userName}
                  isLocal={pinnedSource.isLocal}
                  isMuted={pinnedSource.isLocal && isMuted}
                  isVideoOff={pinnedSource.isLocal && isVideoOff}
                  localVideoRef={pinnedSource.isLocal ? localVideoRef : undefined}
                  isSpeaking={speakingUsers.has(pinnedSource.peerId)}
                  isPinned
                  onPin={() => setPinnedPeerId(null)}
                />
              </div>
              {unpinnedSources.length > 0 && (
                <div className="w-44 flex flex-col gap-2 overflow-y-auto shrink-0">
                  {unpinnedSources.map(({ peerId, stream, userName, isLocal }) => (
                    <div key={peerId} className="aspect-video shrink-0">
                      <VideoTile
                        stream={stream}
                        userName={userName}
                        isLocal={isLocal}
                        isMuted={isLocal && isMuted}
                        isVideoOff={isLocal && isVideoOff}
                        localVideoRef={isLocal ? localVideoRef : undefined}
                        isSpeaking={speakingUsers.has(peerId)}
                        onPin={() => setPinnedPeerId(peerId)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Normal grid */
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
                  isSpeaking={speakingUsers.has(peerId)}
                  onPin={() => setPinnedPeerId(peerId)}
                />
              ))}
            </div>
          )}
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
              onClick={() => { setShowChat((c) => !c); setShowParticipants(false); setShowAI(false); setShowNotes(false); }}
              icon={<MessageSquare size={18} />}
              label="Chat"
              badge={chatMessages.length > 0 ? chatMessages.length : undefined}
              testId="button-toggle-chat"
            />
            <ControlBtn
              active={showParticipants}
              onClick={() => { setShowParticipants((p) => !p); setShowChat(false); setShowAI(false); setShowNotes(false); }}
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
              onClick={() => { setShowAI((a) => !a); setShowChat(false); setShowParticipants(false); setShowNotes(false); }}
              icon={<Brain size={18} />}
              label="AI Assistant"
              testId="button-toggle-ai"
            />
            <ControlBtn
              active={showNotes}
              onClick={() => { setShowNotes((n) => !n); setShowChat(false); setShowParticipants(false); setShowAI(false); }}
              icon={<FileText size={18} />}
              label="Meeting Notes"
              testId="button-toggle-notes"
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

        {showNotes && (
          <motion.div
            key="notes"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 bg-[#1A1D2E] border-l border-white/10 flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <h3 className="font-semibold text-sm">Meeting Notes</h3>
              </div>
              <button onClick={() => setShowNotes(false)} className="text-white/40 hover:text-white/80"><X size={16} /></button>
            </div>
            <div className="flex-1 p-3 flex flex-col gap-2 min-h-0">
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Shared meeting notes — visible to everyone in the room. Type action items, decisions, key points..."
                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 leading-relaxed min-h-0 font-mono"
                data-testid="input-notes"
              />
              <p className="text-xs text-white/25 text-right shrink-0">
                {notesSaved
                  ? `Saved at ${notesSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Changes save automatically'}
              </p>
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

function VideoTile({ stream, userName, isLocal, isMuted, isVideoOff, localVideoRef, isSpeaking, isPinned, onPin }: {
  stream?: MediaStream | null;
  userName: string;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  isSpeaking?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ref = localVideoRef ?? videoRef;

  useEffect(() => {
    if (!isLocal && stream && ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream, isLocal, ref]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#1A1D2E] aspect-video flex items-center justify-center group transition-all duration-150 ${
        isSpeaking
          ? 'border-2 border-indigo-400 shadow-[0_0_20px_3px_rgba(99,102,241,0.4)]'
          : 'border border-white/10'
      }`}
    >
      {isVideoOff || (!stream && !isLocal) ? (
        <div className="flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-300 transition-all duration-150 ${isSpeaking ? 'ring-4 ring-indigo-400/30 scale-110' : ''}`}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-white/40">{userName}</span>
        </div>
      ) : (
        <video ref={ref} autoPlay muted={isLocal} playsInline className="w-full h-full object-cover" />
      )}

      {/* Live speaking waveform indicator */}
      {isSpeaking && (
        <div className="absolute top-2 right-2 flex items-end gap-px">
          {[4, 7, 5, 9, 6].map((h, i) => (
            <div
              key={i}
              className="w-0.5 bg-indigo-400 rounded-full animate-pulse"
              style={{ height: `${h}px`, animationDelay: `${i * 0.12}s`, animationDuration: '0.6s' }}
            />
          ))}
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1">
        {isMuted && <MicOff size={11} className="text-red-400" />}
        <span className="text-xs text-white font-medium">{isLocal ? `${userName} (You)` : userName}</span>
      </div>

      {/* Pin / Unpin button — appears on hover */}
      {onPin && (
        <button
          onClick={onPin}
          title={isPinned ? 'Exit spotlight' : 'Pin to spotlight'}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white/50 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          {isPinned ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      )}
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

type EmbedCanvas = {
  isDrawingMode: boolean;
  freeDrawingBrush: { color: string; width: number };
  setWidth: (w: number) => void;
  setHeight: (h: number) => void;
  renderAll: () => void;
  requestRenderAll: () => void;
  toJSON: () => unknown;
  toDataURL: (opts: object) => string;
  loadFromJSON: (json: string) => Promise<void>;
  clear: () => void;
  set: (opts: object) => void;
  dispose: () => void;
  add: (...objs: unknown[]) => void;
  remove: (...objs: unknown[]) => void;
  on: (event: string, cb: (opts?: unknown) => void) => void;
  off: (event: string) => void;
  width: number;
  height: number;
};

type EmbedTool = 'pen' | 'rect' | 'circle' | 'line' | 'text' | 'eraser';
const EMBED_COLORS = ['#E2E8F0', '#6366F1', '#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#EC4899'];
const EMBED_BG = '#0F1117';

function WhiteboardEmbed({ roomId, socket }: { roomId: string; token: string; socket: Socket | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<EmbedCanvas | null>(null);
  const isRemoteUpdate = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);

  const [tool, setTool] = useState<EmbedTool>('pen');
  const [color, setColor] = useState('#E2E8F0');
  const [stroke, setStroke] = useState(3);
  const [ready, setReady] = useState(false);

  const emitUpdate = useCallback((canvas: EmbedCanvas) => {
    if (isRemoteUpdate.current || !socket) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socket.emit('whiteboard-update', { roomId, canvasJSON: JSON.stringify(canvas.toJSON()) });
    }, 100);
  }, [socket, roomId]);

  const saveHist = useCallback((canvas: EmbedCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(json);
    historyIdxRef.current = historyRef.current.length - 1;
  }, []);

  const applyJSON = useCallback(async (canvas: EmbedCanvas, json: string) => {
    isRemoteUpdate.current = true;
    try { await canvas.loadFromJSON(json); canvas.renderAll(); }
    catch { /* ignore */ }
    finally { isRemoteUpdate.current = false; }
  }, []);

  useEffect(() => {
    if (!socket) return;
    let canvas: EmbedCanvas | null = null;

    const init = async () => {
      const fm = await import('fabric');
      const el = canvasElRef.current;
      const container = containerRef.current;
      if (!el || !container) return;

      const w = container.clientWidth || 900;
      const h = container.clientHeight || 500;
      const FC = fm.Canvas as unknown as new (el: HTMLCanvasElement, opts: object) => EmbedCanvas;
      canvas = new FC(el, { isDrawingMode: true, width: w, height: h, backgroundColor: EMBED_BG });
      fabricRef.current = canvas;
      canvas.freeDrawingBrush.color = '#E2E8F0';
      canvas.freeDrawingBrush.width = 3;

      canvas.on('path:created', () => { saveHist(canvas!); emitUpdate(canvas!); });
      canvas.on('object:modified', () => { saveHist(canvas!); emitUpdate(canvas!); });
      canvas.on('object:added', () => { if (!isRemoteUpdate.current) emitUpdate(canvas!); });

      const ro = new ResizeObserver(() => {
        if (!canvas || !container) return;
        canvas.setWidth(container.clientWidth);
        canvas.setHeight(container.clientHeight);
        canvas.renderAll();
      });
      ro.observe(container);

      setReady(true);

      // Request existing canvas state from server
      socket.emit('request-whiteboard-state', roomId);

      return ro;
    };

    let ro: ResizeObserver | undefined;
    init().then((r) => { ro = r; });

    const handleState = async ({ canvasJSON }: { canvasJSON: string }) => {
      if (!fabricRef.current) return;
      await applyJSON(fabricRef.current, canvasJSON);
    };
    socket.on('whiteboard-state', handleState);

    return () => {
      ro?.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.off('whiteboard-state', handleState);
      canvas?.dispose();
      fabricRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  const applyTool = useCallback((t: EmbedTool) => {
    setTool(t);
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (t === 'pen') { canvas.isDrawingMode = true; canvas.freeDrawingBrush.color = color; canvas.freeDrawingBrush.width = stroke; }
    else if (t === 'eraser') { canvas.isDrawingMode = true; canvas.freeDrawingBrush.color = EMBED_BG; canvas.freeDrawingBrush.width = stroke * 5; }
    else { canvas.isDrawingMode = false; }
  }, [color, stroke]);

  const applyColor = useCallback((c: string) => {
    setColor(c);
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (tool === 'pen') canvas.freeDrawingBrush.color = c;
  }, [tool]);

  const addShape = useCallback(async (t: EmbedTool) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const fm = await import('fabric');
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    const base = { left: cx - 50, top: cy - 35, stroke: color, strokeWidth: stroke, fill: 'transparent', selectable: true };
    let obj: unknown;
    if (t === 'rect') obj = new (fm.Rect as unknown as new (o: object) => unknown)({ ...base, width: 100, height: 70 });
    else if (t === 'circle') obj = new (fm.Circle as unknown as new (o: object) => unknown)({ ...base, radius: 40 });
    else if (t === 'line') obj = new (fm.Line as unknown as new (p: number[], o: object) => unknown)([cx - 50, cy, cx + 50, cy], { ...base });
    else if (t === 'text') obj = new (fm.IText as unknown as new (s: string, o: object) => unknown)('Type here', { ...base, fill: color, stroke: undefined, fontSize: 18 });
    if (obj) { canvas.add(obj); canvas.requestRenderAll(); saveHist(canvas); emitUpdate(canvas); }
  }, [color, stroke, saveHist, emitUpdate]);

  const handleTool = useCallback((t: EmbedTool) => {
    applyTool(t);
    if (t !== 'pen' && t !== 'eraser') addShape(t);
  }, [applyTool, addShape]);

  const undo = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    await applyJSON(canvas, historyRef.current[historyIdxRef.current]);
    emitUpdate(canvas);
  }, [applyJSON, emitUpdate]);

  const redo = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    await applyJSON(canvas, historyRef.current[historyIdxRef.current]);
    emitUpdate(canvas);
  }, [applyJSON, emitUpdate]);

  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear(); canvas.set({ backgroundColor: EMBED_BG }); canvas.renderAll();
    historyRef.current = []; historyIdxRef.current = -1;
    emitUpdate(canvas);
  }, [emitUpdate]);

  const download = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL({ format: 'png', quality: 1 });
    const a = document.createElement('a'); a.href = url; a.download = `whiteboard-${roomId}.png`; a.click();
    toast.success('Downloaded!');
  }, [roomId]);

  const TOOLS: { id: EmbedTool; icon: React.ReactNode; label: string }[] = [
    { id: 'pen',    icon: <Pen size={14} />,     label: 'Pen' },
    { id: 'rect',   icon: <Square size={14} />,   label: 'Rectangle' },
    { id: 'circle', icon: <Circle size={14} />,   label: 'Circle' },
    { id: 'line',   icon: <Minus size={14} />,    label: 'Line' },
    { id: 'text',   icon: <Type size={14} />,     label: 'Text' },
    { id: 'eraser', icon: <Eraser size={14} />,   label: 'Eraser' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F1117] select-none">
      {/* Mini toolbar */}
      <div className="h-11 flex items-center gap-2 px-3 border-b border-white/10 bg-[#1A1D2E] shrink-0 flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-0.5">
          {TOOLS.map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleTool(t.id)}
                  className={`p-1.5 rounded-lg transition-all ${tool === t.id ? 'bg-indigo-500 text-white' : 'text-white/40 hover:bg-white/10 hover:text-white/80'}`}
                >
                  {t.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="w-px h-5 bg-white/10" />
        {/* Colors */}
        <div className="flex items-center gap-1">
          {EMBED_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => applyColor(c)}
              className={`w-4 h-4 rounded-full border transition-all ${color === c ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#1A1D2E] scale-125' : 'border-white/20 hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="w-px h-5 bg-white/10" />
        {/* Stroke */}
        <input type="range" min={1} max={20} value={stroke} onChange={(e) => { const v = Number(e.target.value); setStroke(v); const canvas = fabricRef.current; if (canvas) canvas.freeDrawingBrush.width = tool === 'eraser' ? v * 5 : v; }} className="w-16 accent-indigo-500" />
        <div className="w-px h-5 bg-white/10" />
        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <Tooltip><TooltipTrigger asChild><button onClick={undo} className="p-1.5 text-white/40 hover:bg-white/10 hover:text-white/80 rounded-lg transition-colors"><Undo2 size={14} /></button></TooltipTrigger><TooltipContent side="bottom">Undo</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button onClick={redo} className="p-1.5 text-white/40 hover:bg-white/10 hover:text-white/80 rounded-lg transition-colors"><Redo2 size={14} /></button></TooltipTrigger><TooltipContent side="bottom">Redo</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button onClick={clearCanvas} className="p-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button></TooltipTrigger><TooltipContent side="bottom">Clear</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button onClick={download} className="p-1.5 text-white/40 hover:bg-white/10 hover:text-white/80 rounded-lg transition-colors"><Download size={14} /></button></TooltipTrigger><TooltipContent side="bottom">Download</TooltipContent></Tooltip>
        </div>
        {!ready && <Loader2 size={13} className="animate-spin text-white/30 ml-auto" />}
      </div>
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
