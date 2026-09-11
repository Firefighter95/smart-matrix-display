import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { ClockConfig, ClockElement, ClockElementId, DeviceStatus, LayoutElement, LayoutModel, Message } from '../../../shared/schemas/models';
import { drawMatrix } from '../preview/renderers';

interface MatrixPreviewProps {
  config: ClockConfig;
  status: DeviceStatus;
  message?: Message;
  layout?: LayoutModel;
  label?: string;
  className?: string;
  interactiveElements?: ClockElement[];
  selectedElement?: ClockElementId;
  onElementSelect?: (id: ClockElementId) => void;
  onElementMove?: (id: ClockElementId, x: number, y: number) => void;
  genericElements?: LayoutElement[];
  selectedGenericElement?: string;
  onGenericElementSelect?: (id: string) => void;
  onGenericElementMove?: (id: string, x: number, y: number) => void;
  showGrid?: boolean;
  zoom?: 1 | 2 | 4 | 6 | 8;
}

const elementLabels: Record<ClockElementId, string> = { time: 'Tijd', date: 'Datum', temperature: 'Temp', wind: 'Wind', status: 'Status', fault: 'Fout' };

export function MatrixPreview({ config, status, message, layout, label = 'LIVE 128 × 64', className = '', interactiveElements, selectedElement, onElementSelect, onElementMove, genericElements, selectedGenericElement, onGenericElementSelect, onGenericElementMove, showGrid = false, zoom = 1 }: MatrixPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<ClockElementId>();
  const genericDragging = useRef<string>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 128;
    canvas.height = 64;
    canvas.style.imageRendering = 'pixelated';
    let animationFrame = 0;
    const render = () => {
      drawMatrix(canvas, config, status, message, new Date(), layout);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [config, status, message, layout]);

  const moveElement = (event: ReactPointerEvent<HTMLElement>) => {
    const id = dragging.current;
    const overlay = overlayRef.current;
    if (!id || !overlay || !onElementMove) return;
    const rect = overlay.getBoundingClientRect();
    const x = Math.max(0, Math.min(127, Math.round(((event.clientX - rect.left) / rect.width) * 128)));
    const y = Math.max(0, Math.min(63, Math.round(((event.clientY - rect.top) / rect.height) * 64)));
    onElementMove(id, x, y);
  };

  const moveGenericElement = (event: ReactPointerEvent<HTMLElement>) => {
    const id = genericDragging.current;
    const overlay = overlayRef.current;
    if (!id || !overlay || !onGenericElementMove) return;
    const rect = overlay.getBoundingClientRect();
    const x = Math.max(0, Math.min(127, Math.round(((event.clientX - rect.left) / rect.width) * 128)));
    const y = Math.max(0, Math.min(63, Math.round(((event.clientY - rect.top) / rect.height) * 64)));
    onGenericElementMove(id, x, y);
  };

  const brightness = Math.min(100, Math.max(0, status.brightness));
  return (
    <div className={`matrix-frame ${className}`}>
      <div className="matrix-frame__header">
        <span>{label}</span>
        <span className="matrix-frame__meta">{status.mode} · {brightness}%</span>
      </div>
      <div className={`matrix-canvas-wrap ${zoom > 1 ? 'matrix-canvas-wrap--zoomed' : ''}`} style={{ '--matrix-dim': `${1 - brightness / 100}`, '--matrix-zoom': zoom } as React.CSSProperties}>
        <canvas ref={canvasRef} aria-label="128 bij 64 pixel preview" />
        {showGrid && <div className="matrix-builder-grid" aria-hidden="true" />}
        {(interactiveElements || genericElements) && <div ref={overlayRef} className="matrix-builder-overlay" onPointerMove={(event) => { moveElement(event); moveGenericElement(event); }} onPointerUp={() => { dragging.current = undefined; genericDragging.current = undefined; }}>
          {interactiveElements?.filter((element) => element.enabled).map((element) => <button type="button" key={element.id} className={`matrix-builder-handle ${selectedElement === element.id ? 'is-selected' : ''}`} style={{ left: `${(element.x / 128) * 100}%`, top: `${(element.y / 64) * 100}%` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragging.current = element.id; onElementSelect?.(element.id); }} onPointerMove={moveElement} onPointerUp={() => { dragging.current = undefined; }} aria-label={`Verplaats ${elementLabels[element.id]}`}>{elementLabels[element.id]}</button>)}
          {genericElements?.filter((element) => element.visible !== false).map((element) => <button type="button" key={`generic-${element.id}`} className={`matrix-builder-handle matrix-builder-handle--generic ${selectedGenericElement === element.id ? 'is-selected' : ''}`} style={{ left: `${(element.x / 128) * 100}%`, top: `${(element.y / 64) * 100}%` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); genericDragging.current = element.id; onGenericElementSelect?.(element.id); }} onPointerMove={moveGenericElement} onPointerUp={() => { genericDragging.current = undefined; }} aria-label={`Verplaats ${element.name ?? element.type}`}>{element.name ?? element.type}</button>)}
        </div>}
        <div className="matrix-dim-overlay" />
      </div>
      <div className="matrix-frame__footer"><span>ESP32-S3</span><span>{status.resolution} · pixel perfect</span></div>
    </div>
  );
}
