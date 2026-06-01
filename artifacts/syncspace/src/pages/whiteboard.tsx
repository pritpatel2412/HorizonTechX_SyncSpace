import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'wouter';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';
import { toast } from 'react-hot-toast';
import {
  Pen, Square, Circle, Minus, Type, Eraser,
  Undo2, Redo2, Trash2, Download, ChevronLeft,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Tool = 'pen' | 'rect' | 'circle' | 'line' | 'text' | 'eraser';

const COLORS = ['#E2E8F0', '#6366F1', '#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#EC4899', '#000000'];

export function Whiteboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<unknown>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteUpdate = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [activeColor, setActiveColor] = useState('#E2E8F0');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!roomId || !token) return;

    const socket = io(window.location.origin, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', roomId, user?.id ?? 0, user?.name ?? 'Guest');
    });

    let debounceTimer: ReturnType<typeof setTimeout>;

    const initCanvas = async () => {
      const fabricModule = await import('fabric');
      const FabricCanvas = fabricModule.Canvas as unknown as new (el: HTMLCanvasElement, opts: object) => unknown;
      const el = canvasRef.current;
      if (!el) return;

      const canvas = new FabricCanvas(el, {
        isDrawingMode: true,
        width: el.parentElement?.clientWidth ?? 1200,
        height: el.parentElement?.clientHeight ?? 700,
        backgroundColor: '#1A1D2E',
      });
      fabricRef.current = canvas;
      setIsReady(true);

      const saveHistory = () => {
        const json = JSON.stringify((canvas as { toJSON: () => unknown }).toJSON());
        const idx = historyIndexRef.current;
        historyRef.current = historyRef.current.slice(0, idx + 1);
        historyRef.current.push(json);
        historyIndexRef.current = historyRef.current.length - 1;
      };

      const emitUpdate = () => {
        if (isRemoteUpdate.current) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const json = JSON.stringify((canvas as { toJSON: () => unknown }).toJSON());
          socket.emit('whiteboard-update', { roomId, canvasJSON: json });
        }, 100);
      };

      (canvas as { on: (e: string, cb: () => void) => void }).on('object:modified', () => { saveHistory(); emitUpdate(); });
      (canvas as { on: (e: string, cb: () => void) => void }).on('path:created', () => { saveHistory(); emitUpdate(); });
      (canvas as { on: (e: string, cb: () => void) => void }).on('object:added', () => emitUpdate());

      socket.on('whiteboard-state', ({ canvasJSON }: { canvasJSON: string }) => {
        isRemoteUpdate.current = true;
        (canvas as { loadFromJSON: (j: string, cb: () => void) => void }).loadFromJSON(canvasJSON, () => {
          (canvas as { renderAll: () => void }).renderAll();
          isRemoteUpdate.current = false;
        });
      });

      // Handle resize
      const handleResize = () => {
        const parent = el.parentElement;
        if (!parent) return;
        (canvas as { setWidth: (w: number) => void; setHeight: (h: number) => void; renderAll: () => void })
          .setWidth(parent.clientWidth);
        (canvas as { setWidth: (w: number) => void; setHeight: (h: number) => void; renderAll: () => void })
          .setHeight(parent.clientHeight);
        (canvas as { setWidth: (w: number) => void; setHeight: (h: number) => void; renderAll: () => void })
          .renderAll();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        (canvas as { dispose: () => void }).dispose();
      };
    };

    const cleanup = initCanvas();

    return () => {
      cleanup.then((fn) => fn?.());
      socket.emit('leave-room', roomId);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  const applyTool = (tool: Tool) => {
    setActiveTool(tool);
    const canvas = fabricRef.current as {
      isDrawingMode: boolean;
      freeDrawingBrush: { color: string; width: number };
    } | null;
    if (!canvas) return;

    if (tool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else if (tool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = '#1A1D2E';
      canvas.freeDrawingBrush.width = strokeWidth * 4;
    } else {
      canvas.isDrawingMode = false;
    }
  };

  const applyColor = (color: string) => {
    setActiveColor(color);
    const canvas = fabricRef.current as { freeDrawingBrush: { color: string } } | null;
    if (canvas && (activeTool === 'pen' || activeTool === 'eraser')) {
      canvas.freeDrawingBrush.color = activeTool === 'eraser' ? '#1A1D2E' : color;
    }
  };

  const applyStroke = (w: number) => {
    setStrokeWidth(w);
    const canvas = fabricRef.current as { freeDrawingBrush: { width: number } } | null;
    if (canvas) canvas.freeDrawingBrush.width = activeTool === 'eraser' ? w * 4 : w;
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const json = historyRef.current[historyIndexRef.current];
    isRemoteUpdate.current = true;
    (fabricRef.current as { loadFromJSON: (j: string, cb: () => void) => void })
      ?.loadFromJSON(json, () => {
        (fabricRef.current as { renderAll: () => void })?.renderAll();
        isRemoteUpdate.current = false;
      });
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const json = historyRef.current[historyIndexRef.current];
    isRemoteUpdate.current = true;
    (fabricRef.current as { loadFromJSON: (j: string, cb: () => void) => void })
      ?.loadFromJSON(json, () => {
        (fabricRef.current as { renderAll: () => void })?.renderAll();
        isRemoteUpdate.current = false;
      });
  };

  const clearCanvas = () => {
    (fabricRef.current as { clear: () => void; set: (opts: object) => void; renderAll: () => void } | null)?.clear();
    (fabricRef.current as { set: (opts: object) => void; renderAll: () => void } | null)?.set({ backgroundColor: '#1A1D2E' });
    (fabricRef.current as { renderAll: () => void } | null)?.renderAll();
    const json = JSON.stringify((fabricRef.current as { toJSON: () => unknown } | null)?.toJSON());
    socketRef.current?.emit('whiteboard-update', { roomId, canvasJSON: json });
  };

  const downloadPng = () => {
    const canvas = fabricRef.current as { toDataURL: (opts: object) => string } | null;
    if (!canvas) return;
    const url = canvas.toDataURL({ format: 'png' });
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncspace-whiteboard-${roomId}.png`;
    a.click();
    toast.success('Downloaded!');
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pen', icon: <Pen size={16} />, label: 'Pen' },
    { id: 'rect', icon: <Square size={16} />, label: 'Rectangle' },
    { id: 'circle', icon: <Circle size={16} />, label: 'Circle' },
    { id: 'line', icon: <Minus size={16} />, label: 'Line' },
    { id: 'text', icon: <Type size={16} />, label: 'Text' },
    { id: 'eraser', icon: <Eraser size={16} />, label: 'Eraser' },
  ];

  return (
    <div className="dark flex flex-col h-screen bg-[#0F1117] text-[#E2E8F0] overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 flex items-center gap-4 px-4 border-b border-white/10 bg-[#1A1D2E] shrink-0">
        <Link href={roomId ? `/room/${roomId}` : '/'} className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm">
          <ChevronLeft size={16} />
          Back
        </Link>
        <div className="w-px h-6 bg-white/10" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => applyTool(t.id)}
                  className={`p-2 rounded-lg transition-all ${activeTool === t.id ? 'bg-indigo-500 text-white' : 'text-white/40 hover:bg-white/10 hover:text-white/80'}`}
                  data-testid={`button-tool-${t.id}`}
                >
                  {t.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => applyColor(c)}
              className={`w-5 h-5 rounded-full transition-all ${activeColor === c ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#1A1D2E] scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
              data-testid={`button-color-${c.replace('#', '')}`}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Stroke */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Size</span>
          <input
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => applyStroke(Number(e.target.value))}
            className="w-24 accent-indigo-500"
            data-testid="input-stroke-size"
          />
          <span className="text-xs text-white/40 w-4">{strokeWidth}</span>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={undo} className="p-2 text-white/40 hover:bg-white/10 hover:text-white/80 rounded-lg transition-colors" data-testid="button-undo"><Undo2 size={16} /></button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={redo} className="p-2 text-white/40 hover:bg-white/10 hover:text-white/80 rounded-lg transition-colors" data-testid="button-redo"><Redo2 size={16} /></button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={clearCanvas} className="p-2 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" data-testid="button-clear"><Trash2 size={16} /></button>
            </TooltipTrigger>
            <TooltipContent>Clear canvas</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={downloadPng} className="p-2 text-white/40 hover:bg-white/10 hover:text-white/80 rounded-lg transition-colors" data-testid="button-download"><Download size={16} /></button>
            </TooltipTrigger>
            <TooltipContent>Download PNG</TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto text-xs text-white/30">
          {isReady ? `Room: ${roomId}` : 'Loading...'}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden" data-testid="whiteboard-canvas-container">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
