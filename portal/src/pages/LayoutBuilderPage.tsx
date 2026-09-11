import { useEffect, useState } from 'react';
import type { DeviceConfig, DeviceStatus, LayoutElement, LayoutElementType, LayoutModel } from '../../../shared/schemas/models';
import type { DeviceApi } from '../api/deviceApi';
import { MatrixPreview } from '../components/MatrixPreview';
import { Button, SectionHeading, StatusBadge, Toggle } from '../components/Ui';
import { normalizeLayout } from '../engine/layouts';

interface Props { api: DeviceApi; status: DeviceStatus; config: DeviceConfig; layoutId?: string; onNotify: (message: string, kind?: 'success' | 'error' | 'info') => void; }

const ELEMENT_TYPES: LayoutElementType[] = ['text', 'dynamic_text', 'clock', 'date', 'rectangle', 'filled_rectangle', 'line', 'icon', 'status_indicator', 'message_title', 'message_body', 'timer', 'progress'];
const newElement = (type: LayoutElementType, index: number): LayoutElement => ({ id: `${type}-${Date.now()}-${index}`, type, name: type.replace('_', ' '), x: 8, y: 8 + (index * 10) % 48, width: type === 'line' ? 112 : 80, height: type === 'line' ? 1 : 8, zIndex: index, visible: true, scale: 1, color: '#F4F7FF', text: type === 'text' ? 'NIEUW' : type === 'dynamic_text' ? '{{message}}' : undefined, dataSource: type === 'dynamic_text' ? { type: 'event_payload', path: 'message', fallback: '--' } : undefined });

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function LayoutBuilderPage({ api, status, config, layoutId, onNotify }: Props) {
  const source = config.layouts?.find((layout) => layout.id === layoutId) ?? config.layouts?.find((layout) => layout.id === config.activeLayoutId) ?? config.layouts?.[0];
  const [draft, setDraft] = useState<LayoutModel | undefined>(source);
  const [selectedId, setSelectedId] = useState(source?.elements[0]?.id);
  const [past, setPast] = useState<LayoutModel[]>([]);
  const [future, setFuture] = useState<LayoutModel[]>([]);
  const [snap, setSnap] = useState(false);
  const [grid, setGrid] = useState(true);
  const [zoom, setZoom] = useState<1 | 2 | 4 | 6 | 8>(2);

  useEffect(() => { if (!draft && source) setDraft(source); }, [draft, source]);
  const selected = draft?.elements.find((item) => item.id === selectedId);
  const commit = (next: LayoutModel) => { if (!draft) return; setPast((items) => [draft, ...items].slice(0, 30)); setFuture([]); setDraft(normalizeLayout(next)); };
  const updateElement = (id: string, patch: Partial<LayoutElement>) => { if (!draft) return; commit({ ...draft, elements: draft.elements.map((item) => item.id === id ? { ...item, ...patch } : item) }); };
  const setPosition = (axis: 'x' | 'y', value: number) => { if (!selected) return; const step = snap ? 2 : 1; updateElement(selected.id, { [axis]: Math.round(clamp(value / step, 0, axis === 'x' ? 127 / step : 63 / step) * step) }); };
  const addElement = (type: LayoutElementType) => { if (!draft) return; const item = newElement(type, draft.elements.length); setSelectedId(item.id); commit({ ...draft, elements: [...draft.elements, item] }); };
  const remove = () => { if (!draft || !selected) return; const next = draft.elements.filter((item) => item.id !== selected.id); setSelectedId(next[0]?.id); commit({ ...draft, elements: next }); };
  const duplicate = () => { if (!draft || !selected) return; const copy = { ...structuredClone(selected), id: `${selected.id}-copy-${Date.now()}`, x: clamp(selected.x + 2, 0, 127), y: clamp(selected.y + 2, 0, 63), zIndex: selected.zIndex + 1 }; setSelectedId(copy.id); commit({ ...draft, elements: [...draft.elements, copy] }); };
  const moveLayer = (direction: -1 | 1) => { if (selected) updateElement(selected.id, { zIndex: selected.zIndex + direction }); };
  const undo = () => { const previous = past[0]; if (!draft || !previous) return; setFuture((items) => [draft, ...items]); setPast((items) => items.slice(1)); setDraft(previous); };
  const redo = () => { const next = future[0]; if (!draft || !next) return; setPast((items) => [draft, ...items]); setFuture((items) => items.slice(1)); setDraft(next); };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selected || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); return; }
      const step = event.shiftKey ? 4 : 1;
      if (event.key === 'ArrowLeft') { event.preventDefault(); setPosition('x', selected.x - step); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setPosition('x', selected.x + step); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setPosition('y', selected.y - step); }
      if (event.key === 'ArrowDown') { event.preventDefault(); setPosition('y', selected.y + step); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!draft) return <div className="empty-state"><h3>Geen layout beschikbaar</h3><p>Maak eerst een layout aan in de Layout Library.</p></div>;
  const save = async () => { try { await api.saveLayout(draft); onNotify(`Layout opgeslagen: ${draft.name}`); } catch (error) { onNotify(error instanceof Error ? error.message : 'Layout opslaan mislukt', 'error'); } };
  return <div className="page-stack"><SectionHeading eyebrow="PIXEL LAYOUT BUILDER" title={draft.name} description="Alle coördinaten blijven logisch 128×64. Gebruik slepen, numerieke velden of pijltjestoetsen." action={<StatusBadge tone="success">{draft.elements.length} elementen</StatusBadge>} /><div className="builder-toolbar"><div className="form-actions"><Button variant="primary" onClick={() => void save()}>Layout opslaan</Button><Button onClick={undo} disabled={!past.length}>Undo</Button><Button onClick={redo} disabled={!future.length}>Redo</Button><Button onClick={duplicate} disabled={!selected}>Dupliceren</Button><Button variant="danger" onClick={remove} disabled={!selected}>Verwijderen</Button></div><div className="form-actions"><Toggle checked={grid} onChange={setGrid} label="Pixelgrid" /><Toggle checked={snap} onChange={setSnap} label="Snap 2px" /><label className="field"><span>Zoom</span><select value={zoom} onChange={(event) => setZoom(Number(event.target.value) as typeof zoom)}>{[1, 2, 4, 6, 8].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label></div></div><div className="two-column-layout two-column-layout--clock"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">ELEMENTS</span><h2>Element toevoegen</h2></div></div><div className="form-grid">{ELEMENT_TYPES.map((type) => <Button key={type} onClick={() => addElement(type)}>+ {type}</Button>)}</div><div className="builder-elements">{draft.elements.sort((a, b) => a.zIndex - b.zIndex).map((item) => <button type="button" key={item.id} className={`builder-element__select ${item.id === selectedId ? 'is-selected' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.name ?? item.type}</strong><small>{item.type} · X {item.x} · Y {item.y}</small></button>)}</div>{selected && <div className="builder-position"><div className="panel-heading"><div><span className="eyebrow">INSPECTOR</span><h3>{selected.name ?? selected.type}</h3></div><span className="muted">z {selected.zIndex}</span></div><div className="form-grid"><label className="field"><span>Naam</span><input value={selected.name ?? ''} onChange={(event) => updateElement(selected.id, { name: event.target.value })} /></label><label className="field"><span>Type</span><select value={selected.type} onChange={(event) => updateElement(selected.id, { type: event.target.value as LayoutElementType })}>{ELEMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label className="field"><span>X</span><input type="number" min="0" max="127" value={selected.x} onChange={(event) => setPosition('x', Number(event.target.value))} /></label><label className="field"><span>Y</span><input type="number" min="0" max="63" value={selected.y} onChange={(event) => setPosition('y', Number(event.target.value))} /></label><label className="field"><span>Width</span><input type="number" min="1" max="128" value={selected.width} onChange={(event) => updateElement(selected.id, { width: clamp(Number(event.target.value), 1, 128 - selected.x) })} /></label><label className="field"><span>Height</span><input type="number" min="1" max="64" value={selected.height} onChange={(event) => updateElement(selected.id, { height: clamp(Number(event.target.value), 1, 64 - selected.y) })} /></label><label className="field"><span>Tekst</span><input value={selected.text ?? ''} onChange={(event) => updateElement(selected.id, { text: event.target.value })} /></label><label className="field"><span>Kleur</span><input type="color" value={selected.color ?? '#F4F7FF'} onChange={(event) => updateElement(selected.id, { color: event.target.value })} /></label><label className="field"><span>Z-index</span><input type="number" value={selected.zIndex} onChange={(event) => updateElement(selected.id, { zIndex: Number(event.target.value) })} /></label><label className="field field--check"><Toggle checked={selected.visible} onChange={(visible) => updateElement(selected.id, { visible })} /><span><strong> zichtbaar</strong><small>Render dit element</small></span></label></div><div className="form-actions"><Button onClick={() => moveLayer(1)}>Naar voren</Button><Button onClick={() => moveLayer(-1)}>Naar achter</Button></div></div>}</section><section className="panel panel--preview"><div className="panel-heading"><div><span className="eyebrow">LIVE DESIGN PREVIEW</span><h2>128×64 frame</h2><p>Drag een label, klik voor selectie, gebruik pijltjes voor pixelprecisie.</p></div></div><MatrixPreview config={config.clock} status={{ ...status, mode: 'CLOCK', activeLayout: draft.id }} layout={draft} genericElements={draft.elements} selectedGenericElement={selectedId} onGenericElementSelect={setSelectedId} onGenericElementMove={(id, x, y) => updateElement(id, { x, y })} showGrid={grid} zoom={zoom} /></section></div></div>;
}
