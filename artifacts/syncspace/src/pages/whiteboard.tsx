import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';
import { toast } from 'react-hot-toast';
import {
  Pen, Square, Circle, Minus, Type, Eraser,
  Undo2, Redo2, Trash2, Download, ChevronLeft, Loader2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Tool = 'pen' | 'rect' | 'circle' | 'line' | 'text' | 'eraser';

type FabricCanvas = {
  isDrawingMode: boolean;
  freeDrawingBrush: { color: string; width: number };
  setDimensions: (dims: { width: number; height: number }) => void;
  renderAll: () => void;
  toJSON: () => unknown;
  toDataURL: (opts: object) => string;
  loadFromJSON: (json: string) => Promise<void>;
  clear: () => void;
  set: (opts: object) => void;
  dispose: () => void;
  add: (...objs: unknown[]) => void;
  on: (event: string, cb: (opts?: unknown) => void) => void;
  off: (event: string) => void;
  getObjects: () => unknown[];
  remove: (...objs: unknown[]) => void;
  requestRenderAll: () => void;
};

const COLORS = ['#E2E8F0', '#57c1ff', '#59d499', '#ff6161', '#ffc533', '#cdcdcd', '#6a6b6c', '#0d0d0d'];
const BG_COLOR = '#0d0d0d';

export function Whiteboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteUpdate = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [activeColor, setActiveColor] = useState('#E2E8F0');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isReady, setIsReady] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);

  // Emit canvas state to other users (debounced)
  const emitUpdate = useCallback((canvas: FabricCanvas, socket: Socket) => {
    if (isRemoteUpdate.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const json = JSON.stringify(canvas.toJSON());
      socket.emit('whiteboard-update', { roomId, canvasJSON: json });
    }, 100);
  }, [roomId]);

  // Save to local undo history
  const saveHistory = useCallback((canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // Apply remote canvas JSON
  const applyRemoteJSON = useCallback(async (canvas: FabricCanvas, json: string) => {
    isRemoteUpdate.current = true;
    try {
      await canvas.loadFromJSON(json);
      canvas.renderAll();
    } catch (e) {
      console.warn('Failed to load canvas JSON', e);
    } finally {
      isRemoteUpdate.current = false;
    }
  }, []);

  useEffect(() => {
    if (!roomId || !token) return;

    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, { auth: { token } });
    socketRef.current = socket;

    let canvas: FabricCanvas | null = null;

    const initCanvas = async () => {
      const fabricModule = await import('fabric');
      const el = canvasElRef.current;
      const container = containerRef.current;
      if (!el || !container) return;

      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 700;

      const FabricCanvasClass = fabricModule.Canvas as unknown as new (
        el: HTMLCanvasElement,
        opts: object,
      ) => FabricCanvas;

      canvas = new FabricCanvasClass(el, {
        isDrawingMode: true,
        width: w,
        height: h,
        backgroundColor: BG_COLOR,
      });

      fabricRef.current = canvas;
      const PencilBrushClass = fabricModule.PencilBrush as unknown as new (c: FabricCanvas) => { color: string; width: number };
      canvas.freeDrawingBrush = new PencilBrushClass(canvas);
      canvas.freeDrawingBrush.color = '#E2E8F0';
      canvas.freeDrawingBrush.width = 3;

      // Events — save history and emit after each drawing action
      canvas.on('path:created', () => {
        saveHistory(canvas!);
        emitUpdate(canvas!, socket);
      });
      canvas.on('object:modified', () => {
        saveHistory(canvas!);
        emitUpdate(canvas!, socket);
      });
      canvas.on('object:added', () => {
        if (!isRemoteUpdate.current) emitUpdate(canvas!, socket);
      });

      // Receive updates from other users
      socket.on('whiteboard-state', async ({ canvasJSON }: { canvasJSON: string }) => {
        if (!canvas) return;
        await applyRemoteJSON(canvas, canvasJSON);
      });

      // Sync room participants count
      socket.on('all-users', (users: unknown[]) => setConnectedUsers(users.length + 1));
      socket.on('user-joined-notify', () => setConnectedUsers((c) => c + 1));
      socket.on('user-left', () => setConnectedUsers((c) => Math.max(1, c - 1)));

      // Resize canvas when container changes
      const ro = new ResizeObserver(() => {
        if (!canvas || !container) return;
        canvas.setDimensions({ width: container.clientWidth, height: container.clientHeight });
        canvas.renderAll();
      });
      ro.observe(container);

      setIsReady(true);
      return ro;
    };

    socket.on('connect', () => {
      socket.emit('join-room', roomId, user?.id ?? 0, user?.name ?? 'Guest');
    });

    let ro: ResizeObserver | undefined;
    initCanvas().then((observer) => { ro = observer; });

    return () => {
      ro?.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.emit('leave-room', roomId);
      socket.disconnect();
      canvas?.dispose();
      fabricRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  // ─── Tool controls ─────────────────────────────────────────────────────────

  const applyTool = useCallback((tool: Tool) => {
    setActiveTool(tool);
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (tool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else if (tool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = BG_COLOR;
      canvas.freeDrawingBrush.width = strokeWidth * 5;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [activeColor, strokeWidth]);

  const applyColor = useCallback((color: string) => {
    setActiveColor(color);
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (activeTool === 'pen') canvas.freeDrawingBrush.color = color;
    else if (activeTool === 'eraser') canvas.freeDrawingBrush.color = BG_COLOR;
  }, [activeTool]);

  const applyStroke = useCallback((w: number) => {
    setStrokeWidth(w);
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.freeDrawingBrush.width = activeTool === 'eraser' ? w * 5 : w;
  }, [activeTool]);

  const addShape = useCallback(async (tool: Tool) => {
    const canvas = fabricRef.current;
    if (!canvas || tool === 'pen' || tool === 'eraser') return;

    const fabricModule = await import('fabric');
    const cx = (canvas as unknown as { width: number; height: number }).width / 2;
    const cy = (canvas as unknown as { width: number; height: number }).height / 2;

    const commonOpts = {
      left: cx - 60,
      top: cy - 40,
      stroke: activeColor,
      strokeWidth,
      fill: 'transparent',
      selectable: true,
    };

    let obj: unknown;
    if (tool === 'rect') {
      obj = new (fabricModule.Rect as unknown as new (o: object) => unknown)({
        ...commonOpts,
        width: 120,
        height: 80,
      });
    } else if (tool === 'circle') {
      obj = new (fabricModule.Circle as unknown as new (o: object) => unknown)({
        ...commonOpts,
        radius: 50,
      });
    } else if (tool === 'line') {
      obj = new (fabricModule.Line as unknown as new (p: number[], o: object) => unknown)(
        [cx - 60, cy, cx + 60, cy],
        { ...commonOpts, stroke: activeColor },
      );
    } else if (tool === 'text') {
      obj = new (fabricModule.IText as unknown as new (t: string, o: object) => unknown)(
        'Type here',
        { ...commonOpts, fill: activeColor, stroke: undefined, fontSize: 20, fontFamily: 'Inter, sans-serif' },
      );
    }

    if (obj) {
      canvas.add(obj);
      canvas.requestRenderAll();
      saveHistory(canvas);
      emitUpdate(canvas, socketRef.current!);
    }
  }, [activeColor, strokeWidth, saveHistory, emitUpdate]);

  // When a shape tool button is clicked, add a shape instead of draw
  const handleToolClick = useCallback((tool: Tool) => {
    if (tool === 'rect' || tool === 'circle' || tool === 'line' || tool === 'text') {
      applyTool(tool);
      addShape(tool);
    } else {
      applyTool(tool);
    }
  }, [applyTool, addShape]);

  const undo = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const json = historyRef.current[historyIndexRef.current];
    await applyRemoteJSON(canvas, json);
    emitUpdate(canvas, socketRef.current!);
  }, [applyRemoteJSON, emitUpdate]);

  const redo = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const json = historyRef.current[historyIndexRef.current];
    await applyRemoteJSON(canvas, json);
    emitUpdate(canvas, socketRef.current!);
  }, [applyRemoteJSON, emitUpdate]);

  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.set({ backgroundColor: BG_COLOR });
    canvas.renderAll();
    historyRef.current = [];
    historyIndexRef.current = -1;
    if (socketRef.current) {
      const json = JSON.stringify(canvas.toJSON());
      socketRef.current.emit('whiteboard-update', { roomId, canvasJSON: json });
    }
    toast.success('Canvas cleared');
  }, [roomId]);

  const downloadPng = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL({ format: 'png', quality: 1 });
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncspace-whiteboard-${roomId}.png`;
    a.click();
    toast.success('Downloaded!');
  }, [roomId]);

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pen', icon: <Pen size={14} />, label: 'Pen' },
    { id: 'rect', icon: <Square size={14} />, label: 'Rectangle (click to add)' },
    { id: 'circle', icon: <Circle size={14} />, label: 'Circle (click to add)' },
    { id: 'line', icon: <Minus size={14} />, label: 'Line (click to add)' },
    { id: 'text', icon: <Type size={14} />, label: 'Text (click to add)' },
    { id: 'eraser', icon: <Eraser size={14} />, label: 'Eraser' },
  ];

  return (
    <div className="dark flex flex-col h-screen bg-[#07080a] text-[#cdcdcd] overflow-hidden select-none selection:bg-white/10 selection:text-white">
      {/* Toolbar */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-[#242728] bg-[#07080a] shrink-0 flex-wrap">
        <Link
          href={roomId ? `/room/${roomId}` : '/dashboard'}
          className="flex items-center gap-1.5 text-[#9c9c9d] hover:text-[#f4f4f6] transition-colors text-xs font-semibold shrink-0"
        >
          <ChevronLeft size={16} />
          Back
        </Link>
        <div className="w-px h-6 bg-[#242728] shrink-0" />

        {/* Tools - Segmented tab styling */}
        <div className="flex items-center gap-0.5 bg-[#101111] border border-[#242728] p-0.5 rounded-[8px]">
          {tools.map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleToolClick(t.id)}
                  className={`p-1.5 rounded-[6px] transition-colors ${
                    activeTool === t.id
                      ? 'bg-[#121212] text-white border border-[#242728]'
                      : 'text-[#9c9c9d] hover:text-white'
                  }`}
                  data-testid={`button-tool-${t.id}`}
                >
                  {t.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-6 bg-[#242728] shrink-0" />

        {/* Colors */}
        <div className="flex items-center gap-1.5 bg-[#101111] border border-[#242728] p-1.5 rounded-[8px]">
          {COLORS.map((c) => (
            <Tooltip key={c}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => applyColor(c)}
                  className={`w-4 h-4 rounded-full transition-all border ${
                    activeColor === c
                      ? 'ring-1 ring-white scale-110 border-white'
                      : 'hover:scale-105 border-white/10'
                  }`}
                  style={{ backgroundColor: c }}
                  data-testid={`button-color-${c.replace('#', '')}`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">{c}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-6 bg-[#242728] shrink-0" />

        {/* Stroke width */}
        <div className="flex items-center gap-2 bg-[#101111] border border-[#242728] px-3 py-1.5 rounded-[8px] h-8">
          <span className="text-[11px] text-[#6a6b6c] shrink-0">Size</span>
          <input
            type="range"
            min={1}
            max={30}
            value={strokeWidth}
            onChange={(e) => applyStroke(Number(e.target.value))}
            className="w-16 accent-white"
            data-testid="input-stroke-size"
          />
          <span className="text-[11px] text-[#9c9c9d] w-4 text-right font-mono">{strokeWidth}</span>
        </div>

        <div className="w-px h-6 bg-[#242728] shrink-0" />

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={undo}
                className="p-2 text-[#9c9c9d] hover:bg-[#121212] hover:text-white rounded-[8px] transition-colors"
                data-testid="button-undo"
              >
                <Undo2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={redo}
                className="p-2 text-[#9c9c9d] hover:bg-[#121212] hover:text-white rounded-[8px] transition-colors"
                data-testid="button-redo"
              >
                <Redo2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={clearCanvas}
                className="p-2 text-[#9c9c9d] hover:bg-[#ff6161]/15 hover:text-[#ff6161] rounded-[8px] transition-colors"
                data-testid="button-clear"
              >
                <Trash2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={downloadPng}
                className="p-2 text-[#9c9c9d] hover:bg-[#121212] hover:text-white rounded-[8px] transition-colors"
                data-testid="button-download"
              >
                <Download size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Download PNG</TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          {!isReady && <Loader2 size={12} className="animate-spin text-[#6a6b6c]" />}
          {isReady && (
            <span className="text-[11px] text-[#6a6b6c]">
              {connectedUsers} in room · {roomId}
            </span>
          )}
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-[#0d0d0d]"
        data-testid="whiteboard-canvas-container"
      >
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]">
            <div className="flex flex-col items-center gap-3 text-[#6a6b6c]">
              <Loader2 size={24} className="animate-spin text-white" />
              <span className="text-[12px]">Loading canvas...</span>
            </div>
          </div>
        )}
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
