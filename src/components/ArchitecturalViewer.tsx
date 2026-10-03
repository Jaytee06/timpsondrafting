import DrawingWorkspace from './DrawingWorkspace';
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, Line, OrbitControls } from '@react-three/drei';
import { buttsExterior, buttsStudy, exportAssemblyConfiguration, generateAssemblies, layerColors, studyWalls, type Layer } from '../architecture/assemblies';
import { DoubleSide } from 'three';
import { applyChange, ceilingVertices, fixture, generate, openings, undoChange, type Change, type Project } from '../architecture/model';

function Ceiling({ project }: { project: Project }) {
  const positions = useMemo(() => {
    const v = ceilingVertices(project);
    return new Float32Array([0, 2, 1, 0, 3, 2].flatMap(i => [v[i][0], v[i][2], v[i][1]]));
  }, [project]);
  return <mesh><bufferGeometry><bufferAttribute attach="attributes-position" array={positions} count={6} itemSize={3} /></bufferGeometry><meshBasicMaterial color="#a5b4fc" side={DoubleSide} transparent opacity={.55} /></mesh>;
}

export default function ArchitecturalViewer() {
  const [workspace, setWorkspace] = useState<'drawing' | 'study'>('drawing');
  const [project, setProject] = useState<Project>(fixture);
  const [history, setHistory] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [showCeiling, setShowCeiling] = useState(true);
  const [section, setSection] = useState(false);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ framing: true, cavity: false, gypsum: true, sheathing: true, membrane: false, siding: true });
  const [references, setReferences] = useState(true);
  const [showFloor, setShowFloor] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const components = useMemo(() => generateAssemblies(project), [project]);
  const selected = components.find(c => c.id === selectedId);
  const isButtsStudy = project.evidence.some(e => e.id === 'butts-wall-height');
  const parts = useMemo(() => generate(project), [project]);
  const edit = (field: Change['field'], value: number) => {
    try { const next = applyChange(project, { revision: project.revision, field, value }); generateAssemblies(next); setHistory([...history, project]); setProject(next); setError(''); }
    catch (e) { setError((e as Error).message); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportAssemblyConfiguration(project)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'architectural-wall-study.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <main className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-700 p-5"><a href="/" className="text-sm text-sky-300">Timpson Drafting</a><h1 className="text-2xl font-semibold">Architectural workspace</h1><p hidden={workspace !== 'study'} className="text-sm text-slate-400">Assembly study · {isButtsStudy ? 'Butts wall-section evidence' : 'Synthetic spans / proposed wall assembly'} · metres · revision {project.revision}</p></header>
    <nav aria-label="Workspace mode" className="flex gap-2 border-b border-slate-700 p-3"><button className="rounded bg-sky-800 px-3 py-2" aria-pressed={workspace === 'drawing'} onClick={() => setWorkspace('drawing')}>Drawing workflow</button><button className="rounded bg-slate-700 px-3 py-2" aria-pressed={workspace === 'study'} onClick={() => setWorkspace('study')}>Assembly study</button></nav>
    <div hidden={workspace !== 'drawing'}><DrawingWorkspace /></div>
    <div hidden={workspace !== 'study'}><div className="grid lg:grid-cols-[320px_1fr]">
      <aside className="space-y-5 p-5 lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto"><p>Reference lines drive wall assemblies. Peel back surface layers to reveal framing and cavity regions. Study spans and openings remain synthetic.</p>
        <button className="rounded bg-sky-800 p-2" onClick={() => { setHistory([...history, project]); setProject({ ...buttsStudy, revision: project.revision + 1 }); setError(''); }}>Load Butts wall study</button>
        <fieldset className="space-y-2"><legend className="font-semibold">Wall layers</legend>{(Object.keys(layers) as Layer[]).map(layer => <label key={layer} className="block capitalize"><input type="checkbox" checked={layers[layer]} onChange={e => setLayers({ ...layers, [layer]: e.target.checked })} /> {layer}{layer === 'cavity' ? ' regions (schematic insulation)' : ''}</label>)}<button className="rounded bg-slate-700 p-2" onClick={() => setLayers({ framing: true, cavity: false, gypsum: false, sheathing: false, membrane: false, siding: false })}>Reveal framing</button></fieldset>
        <fieldset><legend className="font-semibold">Object types</legend><label className="block"><input type="checkbox" checked={showFloor} onChange={e => setShowFloor(e.target.checked)} /> Floors</label><p className="text-sm text-slate-400">Wall assemblies available. Furniture and style tools follow later.</p></fieldset>
        <label className="block"><input type="checkbox" checked={references} onChange={e => setReferences(e.target.checked)} /> Reference lines and points</label>
        {(['width', 'depth', 'height', 'pitch'] as const).map(field => <label key={field} className="block capitalize">{field}{field === 'pitch' ? ' (rise/run)' : ' (m)'}<input className="mt-1 block w-full rounded bg-slate-800 p-2" disabled={field === 'height' && isButtsStudy} type="number" step={field === 'pitch' ? .05 : .1} value={Number(project[field].toFixed(6))} onChange={e => edit(field, e.target.valueAsNumber)} /></label>)}
        <p role="alert" className="text-red-300">{error}</p>
        <label className="block"><input type="checkbox" checked={showCeiling} onChange={e => setShowCeiling(e.target.checked)} /> Show ceiling plane</label>
        <label className="block"><input type="checkbox" checked={section} onChange={e => setSection(e.target.checked)} /> Dimensioned section</label>
        <div className="flex gap-2"><button className="rounded bg-slate-700 p-2 disabled:opacity-40" disabled={!history.length} onClick={() => { setProject(undoChange(project, history[history.length - 1])); setHistory(history.slice(0, -1)); setError(''); }}>Undo</button><button className="rounded bg-sky-800 p-2" onClick={download}>Export configuration</button></div>
        <p className="text-sm text-slate-400">{project.evidence.map(e => <span className="block" key={e.id}>{e.original}</span>)} Ceiling pitch and opening sizes are synthetic. Source dimensions stay separate from proposals. This is not the Butts house shell.</p>
        <details><summary>Assembly evidence and unresolved details</summary><p className="text-sm">{buttsExterior.framingDepth.original} · {buttsExterior.spacing.original}</p>{buttsExterior.layers.map(l => <p key={l.id} className="text-sm">{l.label}: {l.thickness.original} · {l.thickness.status} · {l.thickness.source}</p>)}{buttsExterior.unresolved.map(note => <p key={note} className="my-2 text-sm text-amber-200">{note}</p>)}</details>
        <div className="rounded bg-slate-800 p-3 text-sm"><h2 className="font-semibold">Selected component</h2>{selected ? <><p className="break-all">{selected.id}</p><p>{selected.role} · {selected.layer} · {selected.status}</p><p>{selected.size.map(n => n.toFixed(4)).join(' × ')} m</p><p>Hosted by {selected.owner}</p></> : <p>Click a visible wall component to inspect its identity and dimensions.</p>}</div>
        {openings(project).map(o => <p key={o.id} className="text-sm">{o.id}: {o.width.toFixed(2)} m wide · offset {o.offset.toFixed(2)} m · head {o.head.toFixed(2)} m</p>)}
      </aside>
      <section aria-label="Architectural model" className="min-w-0">
        <div className="h-[65vh] min-h-[400px]"><Canvas camera={{ position: [8, 7, 9], fov: 45 }}><color attach="background" args={['#0f172a']} /><ambientLight intensity={1.2} /><directionalLight position={[5, 8, 5]} intensity={2} />{parts.filter(p => p.kind === 'floor' && showFloor).map(p => <mesh key={p.id} name={p.id} position={[p.center[0], p.center[2], p.center[1]]}><boxGeometry args={[p.size[0], p.size[2], p.size[1]]} /><meshStandardMaterial color={p.kind === 'floor' ? '#64748b' : '#e2d6c3'} /></mesh>)}{components.filter(c => layers[c.layer]).map(c => <mesh key={c.id} name={c.id} position={[c.center[0], c.center[2], c.center[1]]} rotation={[0, -c.rotation, 0]} onClick={event => { event.stopPropagation(); setSelectedId(c.id); }}><boxGeometry args={[c.size[0], c.size[2], c.size[1]]} /><meshStandardMaterial color={selectedId === c.id ? '#fbbf24' : layerColors[c.layer]} transparent={c.layer === 'cavity' || c.layer === 'membrane'} opacity={c.layer === 'cavity' ? .25 : c.layer === 'membrane' ? .5 : 1} depthWrite={c.layer !== 'cavity'} /></mesh>)}{references && studyWalls(project).map(w => <group key={w.id}><Line points={[[w.start[0], .015, w.start[1]], [w.end[0], .015, w.end[1]]]} color="#38bdf8" lineWidth={2} />{[w.start, w.end].map((p, i) => <mesh key={i} position={[p[0], .015, p[1]]}><sphereGeometry args={[.04, 12, 8]} /><meshBasicMaterial color="#38bdf8" /></mesh>)}</group>)}{showCeiling && <Ceiling project={project} />}<Grid args={[40, 40]} cellSize={1} sectionSize={5} position={[0, -.16, 0]} fadeDistance={40} /><OrbitControls makeDefault target={[project.width / 2, 1.5, project.depth / 2]} /></Canvas></div>
        {section && <div className="border-t border-slate-700 p-5"><h2>Section along depth · ceiling plane</h2><svg role="img" aria-label="Dimensioned ceiling section" viewBox="0 0 600 230" className="max-h-64 w-full"><path d="M60 170 H540" stroke="#94a3b8" /><path d={`M60 110 L540 ${110 - project.pitch * 80}`} stroke="#a5b4fc" strokeWidth="3" /><text x="60" y="100" fill="white">{project.height.toFixed(3)} m</text><text x="380" y="60" fill="white">{(project.height + project.pitch * project.depth).toFixed(3)} m</text><text x="230" y="200" fill="white">Depth {project.depth.toFixed(3)} m</text></svg><p className="text-sm text-slate-400">Diagram is schematic; labels are authoritative plane measurements.</p></div>}
      </section>
    </div></div>
  </main>;
}
