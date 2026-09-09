import { useEffect, useRef } from 'react';
import type { ClockConfig, DeviceStatus, Message } from '../../../shared/schemas/models';
import { drawMatrix } from '../preview/renderers';

interface MatrixPreviewProps {
  config: ClockConfig;
  status: DeviceStatus;
  message?: Message;
  label?: string;
  className?: string;
}

export function MatrixPreview({ config, status, message, label = 'LIVE 128 × 64', className = '' }: MatrixPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 128;
    canvas.height = 64;
    canvas.style.imageRendering = 'pixelated';
    let animationFrame = 0;
    const render = () => {
      drawMatrix(canvas, config, status, message);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [config, status, message]);

  const brightness = Math.min(100, Math.max(0, status.brightness));
  return (
    <div className={`matrix-frame ${className}`}>
      <div className="matrix-frame__header">
        <span>{label}</span>
        <span className="matrix-frame__meta">{status.mode} · {brightness}%</span>
      </div>
      <div className="matrix-canvas-wrap" style={{ '--matrix-dim': `${1 - brightness / 100}` } as React.CSSProperties}>
        <canvas ref={canvasRef} aria-label="128 bij 64 pixel preview" />
        <div className="matrix-dim-overlay" />
      </div>
      <div className="matrix-frame__footer"><span>ESP32-S3</span><span>{status.resolution} · pixel perfect</span></div>
    </div>
  );
}

