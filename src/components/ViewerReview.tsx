import { useEffect, useRef, useState } from 'react';
import type { RootState } from '@react-three/fiber';
import { reviewSummary, reviewZip, type ReviewCallout } from '../viewer/reviewExport';

type Point = { x: number; y: number };
export default function ViewerReview({ runtime, model, modelUrl, onBusy }: { runtime: RootState | null; model: string; modelUrl: string; onBusy: (busy: boolean) => void }) {
  const [items, setItems] = useState<ReviewCallout[]>([]);
  const [draft, setDraft] = useState<ReviewCallout | null>(null);
  const [note, setNote] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point>({ x: .5, y: .5 });
  const [panel, setPanel] = useState(false);
  const [message, setMessage] = useState('');
  const gesture = useRef({ active: false, pressed: false, points: [] as Point[], cursor: { x: .5, y: .5 } });
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (draft) input.current?.focus(); }, [draft]);
  useEffect(() => {
    if (!items.length && !draft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [items.length, draft]);
  useEffect(() => { onBusy(drawing || Boolean(draft) || panel); }, [drawing, draft, panel, onBusy]);
  useEffect(() => () => onBusy(false), [onBusy]);
  useEffect(() => {
    if (!runtime || !modelUrl || draft || panel) return;
    const canvas = runtime.gl.domElement;
    const g = gesture.current;
    const editable = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('input,textarea,select,[contenteditable="true"]'));
    const block = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const cancel = () => { g.active = false; g.pressed = false; g.points = []; setDrawing(false); setPoints([]); };
    const finish = () => {
      if (!g.active) return;
      g.active = false; g.pressed = false; setDrawing(false);
      if (g.points.length < 3) { setPoints([]); return; }
      try {
        runtime.gl.render(runtime.scene, runtime.camera);
        const image = document.createElement('canvas'); image.width = canvas.width; image.height = canvas.height;
        const ctx = image.getContext('2d'); if (!ctx) throw new Error('Screenshot unavailable.');
        ctx.drawImage(canvas, 0, 0); ctx.strokeStyle = '#ff5b35'; ctx.lineWidth = Math.max(3, image.width / 400); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
        g.points.forEach((p, i) => i ? ctx.lineTo(p.x * image.width, p.y * image.height) : ctx.moveTo(p.x * image.width, p.y * image.height)); ctx.stroke();
        const camera = runtime.camera;
        setDraft({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), model, modelUrl, note: '', points: [...g.points], camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), ...('fov' in camera ? { fov: Number(camera.fov) } : {}) }, screenshot: image.toDataURL('image/png') }); setNote('');
        if (document.pointerLockElement) document.exitPointerLock();
      } catch { setMessage('Could not capture this view. Try again; externally loaded textures may prevent screenshots.'); }
      setPoints([]);
    };
    const keydown = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      if (g.active) { block(e); if (e.code === 'Escape') cancel(); return; }
      if (e.code !== 'KeyQ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      block(e); g.active = true; g.points = []; g.cursor = { x: .5, y: .5 }; setCursor(g.cursor); setDrawing(true); setPoints([]); setMessage('');
    };
    const keyup = (e: KeyboardEvent) => { if (g.active && e.code === 'KeyQ') { block(e); finish(); } };
    const point = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      g.cursor = document.pointerLockElement ? { x: Math.max(0, Math.min(1, g.cursor.x + e.movementX / rect.width)), y: Math.max(0, Math.min(1, g.cursor.y + e.movementY / rect.height)) } : { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) };
      setCursor({ ...g.cursor });
      if (g.pressed) { g.points.push({ ...g.cursor }); setPoints([...g.points]); }
    };
    const down = (e: MouseEvent) => { if (!g.active) return; block(e); if (e.button !== 0) return; g.pressed = true; point(e); };
    const move = (e: MouseEvent) => { if (!g.active) return; block(e); point(e); };
    const up = (e: MouseEvent) => { if (!g.active) return; block(e); if (e.button === 0) g.pressed = false; };
    const click = (e: MouseEvent) => { if (g.active) block(e); };
    document.addEventListener('keydown', keydown, true); document.addEventListener('keyup', keyup, true);
    document.addEventListener('mousedown', down, true); document.addEventListener('mousemove', move, true); document.addEventListener('mouseup', up, true); document.addEventListener('click', click, true); window.addEventListener('blur', cancel);
    return () => { document.removeEventListener('keydown', keydown, true); document.removeEventListener('keyup', keyup, true); document.removeEventListener('mousedown', down, true); document.removeEventListener('mousemove', move, true); document.removeEventListener('mouseup', up, true); document.removeEventListener('click', click, true); window.removeEventListener('blur', cancel); g.active = false; g.pressed = false; };
  }, [runtime, model, modelUrl, draft, panel]);
  const save = () => { if (draft) setItems(current => [...current, { ...draft, note: note.trim() }]); setDraft(null); };
  const exportAll = () => {
    const url = URL.createObjectURL(reviewZip(items)); const a = document.createElement('a'); a.href = url; a.download = 'model-review.zip'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  return <>
    <button type="button" className="absolute bottom-3 right-3 z-20 rounded border border-white/30 bg-slate-950 px-3 py-2 text-xs" onClick={() => { document.exitPointerLock(); setPanel(!panel); }}>Review ({items.length})</button>
    {drawing && <div className="pointer-events-none absolute inset-0 z-30"><svg className="h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none"><polyline points={points.map(p => `${p.x * 1000},${p.y * 1000}`).join(' ')} fill="none" stroke="#ff5b35" strokeWidth="3" vectorEffect="non-scaling-stroke" /><circle cx={cursor.x * 1000} cy={cursor.y * 1000} r="4" fill="white" /></svg><p className="absolute left-3 top-3 rounded bg-slate-950/90 p-2 text-xs">Hold Q + drag to circle · Release Q to write · Esc cancels</p></div>}
    {draft && <div role="dialog" aria-label="Callout note" className="absolute z-40 w-80 max-w-[calc(100%_-_1rem)] rounded border border-orange bg-slate-950 p-3 shadow-xl" style={{ left: `${Math.min(55, Math.max(2, (draft.points[draft.points.length - 1]?.x ?? .5) * 100))}%`, top: `${Math.min(50, Math.max(2, (draft.points[draft.points.length - 1]?.y ?? .5) * 100))}%` }}><img src={draft.screenshot} alt="Your marked view" className="mb-2 max-h-28 w-full object-contain" /><label className="block text-xs">Optional note<textarea ref={input} value={note} onChange={e => setNote(e.target.value)} className="mt-2 w-full rounded bg-slate-800 p-2 text-sm" placeholder="Describe the concern…" onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setDraft(null); if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); save(); } }} /></label><div className="mt-2 flex gap-3 text-xs"><button onClick={save}>Save callout ↵</button><button onClick={() => setDraft(null)}>Cancel</button></div></div>}
    {panel && <aside aria-label="Review callouts" className="absolute inset-y-0 right-0 z-30 w-80 max-w-full overflow-auto border-l border-white/20 bg-slate-950 p-4"><div className="flex justify-between"><h2 className="font-semibold">Review callouts ({items.length})</h2><button aria-label="Close review" onClick={() => setPanel(false)}>×</button></div><p className="my-3 text-xs text-slate-400">Hold Q and drag to mark a view. Release Q to write. Callouts remain here until you leave or reload this viewer. Export before leaving.</p><div className="mb-4 flex gap-3 text-xs"><button disabled={!items.length} onClick={exportAll}>Export ZIP</button><button disabled={!items.length} onClick={async () => { try { await navigator.clipboard.writeText(reviewSummary(items)); setMessage('Summary copied. Export ZIP to include screenshots.'); } catch { setMessage('Clipboard unavailable. Use Export ZIP.'); } }}>Copy summary</button></div>{items.map((item, i) => <article key={item.id} className="mb-4 border-t border-white/20 pt-3"><p className="mb-2 text-xs">{i + 1}. {item.model}</p><img src={item.screenshot} alt={`Callout ${i + 1}`} /><textarea aria-label={`Note for callout ${i + 1}`} className="mt-2 w-full bg-slate-800 p-2 text-sm" value={item.note} onChange={e => setItems(current => current.map(x => x.id === item.id ? { ...x, note: e.target.value } : x))} /><button className="text-xs text-red-300" onClick={() => setItems(current => current.filter(x => x.id !== item.id))}>Delete</button></article>)}</aside>}
    {message && <p role="status" className="absolute left-3 top-3 z-40 max-w-sm rounded bg-slate-950 p-3 text-xs" onClick={() => setMessage('')}>{message}</p>}
  </>;
}
