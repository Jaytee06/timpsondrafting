import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { buttsExterior, generateWall, layerColors, drawingAssemblies, drawingAssembly, type Layer, type Wall } from '../architecture/assemblies';
import { normalizeDrawing, drawingUnits, parseDimension, wallFromDecision, type Drawing, type SourceMetadata, type WallDecision } from '../architecture/drawings';
import { registerPoints, type ControlPoint } from '../architecture/registration';

import { createReview, restoreReview, type PdfReference } from '../architecture/review';

import { validateDimensions, checkDimensions, type DimensionEvidence } from '../architecture/dimensions';

import { openingHole, validateHostedOpenings, type HostedOpening } from '../architecture/openings';

import { finishKey, resolveFinishes, validateFinishes, type FinishChoice } from '../architecture/finishes';

type Imported = { source: SourceMetadata; drawing: Drawing; database: unknown; decoderWarnings: string[] };
const button = 'rounded bg-sky-800 px-3 py-2 disabled:opacity-40';
const input = 'rounded bg-slate-800 p-2 w-full';
export default function DrawingWorkspace() {
  const [imported, setImported] = useState<Imported | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState<string[]>([]);
  const [focusSpan, setFocusSpan] = useState(20);
  const [zoomSelection, setZoomSelection] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [points, setPoints] = useState<ControlPoint[]>([]);
  const [dimensions, setDimensions] = useState<DimensionEvidence[]>([]);
  const [dimensionText, setDimensionText] = useState('');
  const [dimensionSource, setDimensionSource] = useState('');
  const [tolerance, setTolerance] = useState(.01);
  const [acceptedRegistration, setAcceptedRegistration] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [finishes, setFinishes] = useState<FinishChoice[]>([]);
  const [finishUndo, setFinishUndo] = useState<FinishChoice[][]>([]);
  const [finishPreview, setFinishPreview] = useState<FinishChoice[] | null>(null);
  const [finishDraft, setFinishDraft] = useState({target:'gypsum/interior',thicknessText:'12.7 mm',label:'Painted gypsum',color:'#eee8dc',roughness:.85,note:''});
  const [assemblyId, setAssemblyId] = useState(buttsExterior.id);
  const [hostedOpenings, setHostedOpenings] = useState<HostedOpening[]>([]);
  const [openingKind, setOpeningKind] = useState<HostedOpening['kind']>('window');
  const [openingValues, setOpeningValues] = useState({offsetText:'1 m',widthText:'0.9 m',sillText:'0.9 m',headText:'2.1 m',sourceLabel:''});
  const [shownLayers, setShownLayers] = useState<Layer[]>(['framing']);
  const [reference, setReference] = useState<WallDecision['reference']>('centerline');
  const [reverse, setReverse] = useState(false);
  const [heightText, setHeightText] = useState('9\' 1"');
  const [decisions, setDecisions] = useState<WallDecision[]>([]);
  const [savedPdf, setSavedPdf] = useState<PdfReference | null>(null);
  const [pdf, setPdf] = useState<{ url: string; name: string; sha256: string; bytes: number; lastModified: number } | null>(null);
  const loadGeneration = useRef(0);
  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);
  const displayedFinishes=finishPreview??finishes;
  const selected = imported?.drawing.entities.find(e => e.id === selectedId);
  const matching = useMemo(() => imported?.drawing.entities.filter(e => visible.includes(e.layer)) ?? [], [imported, visible]);
  const displayed = useMemo(() => matching.slice(0, 10000), [matching]);
  const bounds = useMemo(() => {
    const coords = (zoomSelection && selected ? [selected] : displayed).flatMap(e => e.points);
    if (!coords.length) return { x: 0, y: 0, w: 100, h: 100 };
    const ext=coords.reduce((b,p)=>({minX:Math.min(b.minX,p[0]),minY:Math.min(b.minY,p[1]),maxX:Math.max(b.maxX,p[0]),maxY:Math.max(b.maxY,p[1])}),{minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity});
    const x=ext.minX,y=ext.minY,w=ext.maxX-x,h=ext.maxY-y,margin=Math.max(w,h)*.1||1;
    if(zoomSelection && selected){const span=Number.isFinite(focusSpan)&&focusSpan>0?focusSpan/(drawingUnits[imported?.drawing.unitCode??0]?.metres??1):Math.max(w,h)*4;const size=Math.max(span,w+2*margin,h+2*margin);return {x:x+w/2-size/2,y:y+h/2-size/2,w:size,h:size};}
    return { x:x-margin,y:y-margin,w:w+2*margin,h:h+2*margin };
  }, [displayed, zoomSelection, selected, focusSpan, imported]);
  const fit = useMemo(() => { try { return { registration: registerPoints(points), error: '' }; } catch(e) { return { registration: null, error: (e as Error).message }; } }, [points]);
  const registration = fit.registration;
  const scope = useMemo(() => points.length ? { min: [Math.min(...points.map(p=>p.drawing[0])),Math.min(...points.map(p=>p.drawing[1]))] as [number,number], max: [Math.max(...points.map(p=>p.drawing[0])),Math.max(...points.map(p=>p.drawing[1]))] as [number,number] } : undefined, [points]);
  const dimensionChecks = imported ? checkDimensions(dimensions, imported.drawing, registration, tolerance, scope) : [];
  const dimensionConflict = dimensionChecks.some(d=>d.conflict);
  const fitAcceptable = !dimensionConflict && !!registration && Number.isFinite(tolerance) && tolerance > 0 && tolerance <= .1 && registration.max <= tolerance;
  const candidate = useMemo(() => {
    if (!selected || !registration || !imported || !acceptedRegistration) return { wall: null, error: '' };
    try { const wall = wallFromDecision(selected, { entityId: selected.id, reference, reverse, height: parseDimension(heightText), assemblyId, status: 'proposed' }, registration, imported.source, drawingAssembly(assemblyId).framingDepth.metres, scope);
      const previous=decisions.find(d=>d.entityId===selected.id);
      const holes=hostedOpenings.filter(o=>o.hostEntityId===selected.id);
      if(holes.length&&previous&&previous.reverse!==reverse)throw new Error('Remove hosted openings before reversing this wall reference');
      validateFinishes(finishes.filter(f=>f.hostEntityId===selected.id),[{entityId:selected.id,wall}],holes);
      generateWall(wall, resolveFinishes(drawingAssembly(assemblyId),selected.id,finishes), holes.map(openingHole)); return { wall, error: '' }; }
    catch(e) { return { wall: null, error: (e as Error).message }; }
  }, [selected, registration, imported, acceptedRegistration, reference, reverse, heightText, scope, assemblyId, hostedOpenings, decisions, finishes]);
  const walls = useMemo(() => {
    if (!registration || !imported || !acceptedRegistration) return [];
    return decisions.map(d => wallFromDecision(imported.drawing.entities.find(e => e.id === d.entityId)!, d, registration, imported.source, drawingAssembly(d.assemblyId).framingDepth.metres, scope));
  }, [decisions, imported, registration, acceptedRegistration, scope]);
  const previewWalls = candidate.wall ? [...walls.filter(w => w.id !== candidate.wall?.id), candidate.wall] : walls;
  const parts = previewWalls.flatMap(w => generateWall(w, resolveFinishes(drawingAssembly(w.assemblyId), decisions.find(d=>`${imported?.source.id}:${d.entityId}:wall`===w.id)?.entityId??selectedId, displayedFinishes), hostedOpenings.filter(o=>`${imported?.source.id}:${o.hostEntityId}:wall`===w.id).map(openingHole)));
  const selectSource = (id:string) => {
    setFinishPreview(null);setSelectedId(id);const decision=decisions.find(d=>d.entityId===id);
    if(decision){const layer=drawingAssembly(decision.assemblyId).layers.find(l=>l.id==='gypsum'||l.id==='siding')!;setFinishDraft(draft=>({...draft,target:`${layer.id}/${layer.side}`}));setAssemblyId(decision.assemblyId);setReference(decision.reference);setReverse(decision.reverse);setHeightText(`${decision.height} m`);}
  };
  const resetRegistration = () => { setAcceptedRegistration(false); setDecisions([]);setHostedOpenings([]);setFinishes([]);setFinishUndo([]);setFinishPreview(null); };
  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const token=++loadGeneration.current;setBusy(true);setError('');
    try {
      if (file.size > 20*1024*1024 || file.size < 6) throw new Error('Choose a DWG up to 20 MiB');
      const bytes=await file.arrayBuffer();const version=new TextDecoder().decode(bytes.slice(0,6));
      if(!/^AC\d{4}$/.test(version))throw new Error('File has no recognized DWG signature');
      if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw new Error('DWG decoding currently runs in the local development workspace. Hosted decoding is not configured.');
      const response=await fetch('/api/local-cad/decode',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});
      if (!response.headers.get('Content-Type')?.includes('application/json'))throw new Error('Start npm run dev to enable the local DWG decoder');
      const result=await response.json();if(!response.ok)throw new Error(result.error??'Could not decode DWG');
      const drawing=normalizeDrawing(result.database);
      if (!drawing.entities.length)throw new Error('No supported model-space geometry was decoded');
      const digest=await crypto.subtle.digest('SHA-256',bytes);const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if(token!==loadGeneration.current)return;
      setFinishes([]);setFinishUndo([]);setFinishPreview(null);setHostedOpenings([]);setDimensions([]);setSavedPdf(null);setPdf(null);
      setImported({ source:{id:sha256,name:file.name,bytes:file.size,sha256,lastModified:file.lastModified,version,decoder:String(result.decoder)},drawing,database:result.database,decoderWarnings:result.warnings??[] });
      setVisible(drawing.layers.some(l=>l.name==='A-wall')?['A-wall']:drawing.layers.filter(l=>!l.hidden).slice(0,1).map(l=>l.name));setZoomSelection(false);setSelectedId('');setPoints([]);setDecisions([]);setAcceptedRegistration(false);setAcknowledged(false);
    } catch(e) { if(token===loadGeneration.current)setError((e as Error).message); }
    finally { if(token===loadGeneration.current)setBusy(false); }
  };
  const attachPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.size>30*1024*1024){setError('PDF reference limit is 30 MiB');return;}
    const sourceGeneration=loadGeneration.current;
    const signature=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
    if(signature!=='%PDF-'){setError('File has no PDF signature');return;}
    const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(sourceGeneration!==loadGeneration.current)return;
    if(savedPdf && sha256!==savedPdf.sha256){setError('This PDF does not match the reference saved in the review.');return;}
    setError('');
    setPdf({url:URL.createObjectURL(file),name:file.name,sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),bytes:file.size,lastModified:file.lastModified});
  };
  const addControl = (endpoint:number) => {
    if(!selected || points.length >= 20)return;
    setPoints([...points,{id:`control-${Math.max(0,...points.map(p=>Number(p.id.replace('control-',''))||0))+1}`,drawing:selected.points[endpoint],building:[0,0]}]);resetRegistration();
  };
  const acceptWall = () => {
    if(!candidate.wall||!selected)return;
    const d:WallDecision={entityId:selected.id,reference,reverse,height:parseDimension(heightText),assemblyId,status:'accepted'};
    setFinishPreview(null);setFinishUndo([]);
    setDecisions([...decisions.filter(d=>d.entityId!==selected.id),d]);
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const token=++loadGeneration.current;setBusy(true);setError('');
    try {
      if(file.size>100*1024*1024)throw new Error('Source review limit is 100 MiB');
      const restored=restoreReview(JSON.parse(await file.text()));
      if(token!==loadGeneration.current)return;
      setImported({source:restored.source,database:restored.database,drawing:restored.drawing,decoderWarnings:restored.decoderWarnings});
      setFinishes(restored.finishes);setFinishUndo([]);setFinishPreview(null);setHostedOpenings(restored.openings);setDimensions(restored.dimensions);setPoints(restored.controlPoints);setTolerance(restored.toleranceMetres);setAcceptedRegistration(restored.registrationAccepted);setAcknowledged(restored.registrationAccepted);setDecisions(restored.decisions);
      setVisible(restored.drawing.layers.some(l=>l.name==='A-wall')?['A-wall']:restored.drawing.layers.filter(l=>!l.hidden).slice(0,1).map(l=>l.name));
      setSelectedId('');setZoomSelection(false);setPdf(null);setSavedPdf(restored.pdfReference);
    }catch(e){if(token===loadGeneration.current)setError((e as Error).message);}
    finally{if(token===loadGeneration.current)setBusy(false);}
  };
  const addDimension = () => {
    if(!imported||!selected)return;
    try {
      const id=`dimension-${Math.max(0,...dimensions.map(d=>Number(d.id.replace('dimension-',''))||0))+1}`;
      setDimensions(validateDimensions([...dimensions,{id,entityId:selected.id,sourceId:imported.source.id,original:dimensionText,sourceLabel:dimensionSource,status:'proposed'}],imported.drawing,imported.source.id));
      setDimensionText('');setError('');resetRegistration();
    }catch(e){setError((e as Error).message);}
  };
  const addOpening = () => {
    if(!imported||!selected)return;
    try {
      const id=`opening-${crypto.randomUUID()}`;
      const proposal:HostedOpening={id,hostEntityId:selected.id,kind:openingKind,...openingValues,sillText:openingKind==='door'?'0 m':openingValues.sillText,status:'proposed'};
      setFinishPreview(null);setHostedOpenings(validateHostedOpenings([...hostedOpenings,proposal],decisions.map((d,i)=>({entityId:d.entityId,wall:walls[i],assembly:drawingAssembly(d.assemblyId)}))));setError('');
    }catch(e){setError((e as Error).message);}
  };
  const previewFinish = () => {
    if(!selected)return;
    try {
      const [layerId,side]=finishDraft.target.split('/') as [FinishChoice['layerId'],FinishChoice['side']];
      const choice:FinishChoice={hostEntityId:selected.id,layerId,side,thicknessText:finishDraft.thicknessText,note:finishDraft.note,appearance:{label:finishDraft.label,color:finishDraft.color,roughness:finishDraft.roughness}};
      setFinishPreview(validateFinishes([...finishes.filter(f=>finishKey(f)!==finishKey(choice)),choice],decisions.map((d,i)=>({entityId:d.entityId,wall:walls[i]})),hostedOpenings));setError('');
    }catch(e){setFinishPreview(null);setError((e as Error).message);}
  };
  const commitFinishes = (next:FinishChoice[]) => {
    setFinishUndo([...finishUndo,finishes].slice(-20));setFinishes(next);setFinishPreview(null);
  };
  const exportSource = () => {
    if(!imported)return;
    try {
    const snapshot=createReview({pdfReference:pdf?{name:pdf.name,sha256:pdf.sha256,bytes:pdf.bytes,lastModified:pdf.lastModified}:savedPdf,source:imported.source,decoderWarnings:imported.decoderWarnings,database:imported.database,controlPoints:points,dimensions,finishes,openings:hostedOpenings,registrationAccepted:acceptedRegistration,toleranceMetres:tolerance,decisions});
    const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='drawing-workspace.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setError('');
    }catch(e){setError((e as Error).message);}
  };
  return <div className="grid lg:grid-cols-[360px_1fr]">
    <aside className="space-y-5 p-5 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
      <h2 className="text-xl font-semibold">1 · Load source evidence</h2><p className="text-sm text-slate-400">DWG decoding runs on this computer. Source files are not sent to external services. Reloading clears the workspace; export your review before leaving.</p>
      <label className="block">Local DWG<input className="block w-full text-sm" type="file" accept=".dwg" disabled={busy} onChange={load} /></label>
      <label className="block">Restore source review<input className="block w-full text-sm" type="file" accept=".json,application/json" disabled={busy} onChange={restore} /></label>
      {savedPdf&&!pdf&&<p className="text-sm text-amber-200">Saved PDF reference: {savedPdf.name}. Reattach the matching PDF to preview it; original files are not embedded.</p>}
      <label className="block">Optional PDF reference<input className="block w-full text-sm" type="file" accept=".pdf" onChange={attachPdf} /></label>
      {busy&&<p role="status">Loading source evidence…</p>}<p role="alert" className="text-red-300">{error}</p>
      {imported&&<>
        <p className="break-all text-sm">{imported.source.name} · {imported.source.version}<br />{imported.drawing.modelEntityCount} model-space entities · {imported.drawing.entities.length} preview entities · {imported.drawing.blockCount} block definitions<br />Declared units: {drawingUnits[imported.drawing.unitCode]?.label??'unknown'} (verify by control points)</p>
        <details><summary>Decode coverage and warnings</summary>{[...imported.decoderWarnings,...imported.drawing.warnings].map((w,i)=><p key={i} className="my-2 text-sm text-amber-200">{w}</p>)}{Object.entries(imported.drawing.unsupported).map(([type,count])=><p key={type} className="text-sm">{type}: {count} not drawn</p>)}</details>
        <label className="block text-sm"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} /> I reviewed decode coverage and will verify selected geometry against the source.</label>
        <h2 className="text-xl font-semibold">2 · Select and register</h2><p className="text-sm text-slate-400">Isolate the floor-plan layers. Select a segment, add its endpoints as controls, and enter known building coordinates in metres. At least three controls spanning the same plan are required. Wall interpretation is limited to the rectangle covered by those controls. These mappings preserve scale and rotation without stretching. Changing registration or dimension evidence clears accepted walls and their hosted opening proposals.</p>
        <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setVisible(imported.drawing.layers.filter(l=>!l.hidden).map(l=>l.name))}>Show source layers</button><button className={button} onClick={()=>setVisible([])}>Hide layers</button></div>
        <details><summary>Drawing layers ({imported.drawing.layers.length})</summary>{imported.drawing.layers.map(l=><label key={l.name} className="block break-all text-sm"><input type="checkbox" checked={visible.includes(l.name)} onChange={e=>setVisible(e.target.checked?[...visible,l.name]:visible.filter(n=>n!==l.name))} /> {l.name}{l.hidden?' (source hidden)':''}</label>)}</details>
        <label className="block text-sm">Source segment<select className={input} value={selectedId} onChange={e=>selectSource(e.target.value)}><option value="">Select from visible source geometry</option>{displayed.filter(e=>e.straight).map(e=><option key={e.id} value={e.id}>{e.layer} · {e.handle} · {Math.hypot(e.points[1][0]-e.points[0][0],e.points[1][1]-e.points[0][1]).toFixed(2)} drawing units</option>)}</select></label>
        <p className="break-all text-sm">Selected: {selected?`${selected.handle} · ${selected.layer} · ${selected.type}`:'click a source segment'}</p>
        <label className="block text-sm"><input type="checkbox" checked={zoomSelection} disabled={!selected} onChange={e=>setZoomSelection(e.target.checked)} /> Focus around selected segment</label>
        {zoomSelection&&<label className="block text-sm">Focus span (m, using declared units)<input className={input} type="number" min="1" max="100" value={Number.isFinite(focusSpan) ? focusSpan : ''} onChange={e=>setFocusSpan(e.target.valueAsNumber)} /></label>}
        <div className="flex gap-2"><button className={button} disabled={!selected?.straight} onClick={()=>addControl(0)}>Use start point</button><button className={button} disabled={!selected?.straight} onClick={()=>addControl(1)}>Use end point</button></div>
        {points.map((p,i)=><fieldset key={p.id} className="rounded border border-slate-700 p-2"><legend>{p.id}</legend><p className="text-xs">Drawing: {p.drawing.map(n=>n.toFixed(4)).join(', ')}</p><div className="grid grid-cols-2 gap-2">{(['X','Y'] as const).map((axis,index)=><label key={axis} className="text-sm">{axis} metres<input className={input} type="number" step=".001" value={Number.isFinite(p.building[index]) ? p.building[index] : ''} onChange={e=>{setPoints(points.map((q,j)=>j===i?{...q,building:q.building.map((n,k)=>k===index?e.target.valueAsNumber:n) as [number,number]}:q));resetRegistration();}} /></label>)}</div><button className="text-sm text-sky-300" onClick={()=>{setPoints(points.filter((_,j)=>j!==i));resetRegistration();}}>Remove control</button></fieldset>)}
        <label className="block text-sm">Maximum registration residual (m)<input className={input} type="number" min=".0001" max=".1" step=".001" value={Number.isFinite(tolerance) ? tolerance : ''} onChange={e=>{setTolerance(e.target.valueAsNumber);resetRegistration();}} /></label>
        {registration?<div className="text-sm"><p>Scale: {registration.scale.toFixed(8)} m/drawing unit · rotation {(registration.angle*180/Math.PI).toFixed(3)}°</p><p>RMS {registration.rms.toFixed(6)} m · maximum {registration.max.toFixed(6)} m</p>{registration.residuals.map(r=><p key={r.id}>{r.id}: {r.metres.toFixed(6)} m</p>)}{drawingUnits[imported.drawing.unitCode]&&<p>Declared unit scale: {drawingUnits[imported.drawing.unitCode].metres} m/unit. Compare with fitted scale.</p>}</div>:<p className="text-sm text-amber-200">{fit.error}</p>}
        <details><summary>Written dimension evidence ({dimensions.length})</summary>
          <p className="text-sm text-slate-400">Select the segment bounded by the written dimension. Enter its exact text and sheet/detail reference. Confirm only after checking the source; confirmed discrepancies block registration.</p>
          <label className="block text-sm">Written dimension<input className={input} value={dimensionText} onChange={e=>setDimensionText(e.target.value)} placeholder={"12′ 7-3/8″ or 3 m"} /></label>
          <label className="block text-sm">Dimension source reference<input className={input} value={dimensionSource} onChange={e=>setDimensionSource(e.target.value)} placeholder="Sheet / detail / dimension chain" /></label>
          <button className={button} disabled={!selected?.straight||busy} onClick={addDimension}>Record dimension evidence</button>
          {dimensionChecks.map(d=><fieldset key={d.id} className="my-2 rounded border border-slate-700 p-2 text-sm"><legend>{d.id}</legend><p>{d.original} · {d.writtenMetres.toFixed(6)} m</p><p>{d.sourceLabel}</p><p className="break-all">{d.entityId}</p><p>{d.measuredMetres===null?'Awaiting registration':`Drawing measures ${d.measuredMetres.toFixed(6)} m; difference ${d.difference!.toFixed(6)} m`}</p>
            <label>Evidence status<select className={input} value={d.status} onChange={e=>{setDimensions(dimensions.map(q=>q.id===d.id?{...q,status:e.target.value as DimensionEvidence['status']}:q));resetRegistration();}}><option value="proposed">Proposed</option><option value="confirmed">Confirmed against source</option><option value="disputed">Disputed — excluded from acceptance</option></select></label>
            {d.conflict&&<p className="text-amber-200">{d.outsideRegion?'Confirmed dimension lies outside the registered control region.':'Confirmed dimension conflicts with registration.'}</p>}
          </fieldset>)}
        </details>
        {dimensionConflict&&<p role="alert" className="text-amber-200">Resolve confirmed dimension discrepancies before accepting registration.</p>}
        <button className={button} disabled={!fitAcceptable||!acknowledged||acceptedRegistration} onClick={()=>setAcceptedRegistration(true)}>{acceptedRegistration?'Registration accepted':'Accept registration'}</button>
        <h2 className="text-xl font-semibold">3 · Interpret wall references</h2><p className="text-sm text-slate-400">A selected line is evidence. Decide whether it represents a framing centerline or face before creating a wall. Finish faces, curved walls and junctions follow later. Choose an explicit assembly proposal; interior specifications require verification.</p>
        <label className="block">Wall type<select className={input} value={assemblyId} onChange={e=>{setFinishPreview(null);setAssemblyId(e.target.value);}}>{drawingAssemblies.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
        <p className="text-xs text-amber-200">{drawingAssembly(assemblyId).unresolved.join(' ')}</p>
        <label className="block">Reference meaning<select className={input} value={reference} onChange={e=>{setFinishPreview(null);setReference(e.target.value as WallDecision['reference']);}}><option value="centerline">Framing centerline</option><option value="exterior-face">Exterior framing face</option><option value="interior-face">Interior framing face</option></select></label>
        <label className="block"><input type="checkbox" checked={reverse} onChange={e=>{setFinishPreview(null);setReverse(e.target.checked);}} /> Reverse wall direction / outside</label>
        <label className="block">Proposed height<input className={input} value={heightText} onChange={e=>{setFinishPreview(null);setHeightText(e.target.value);}} /></label>
        <p className="text-sm text-red-300">{candidate.error}</p><button className={button} disabled={!candidate.wall||busy} onClick={acceptWall}>Accept wall interpretation</button>
        <p className="text-sm">{decisions.length} accepted wall interpretations. Acceptance records your interpretation; structural details remain proposals.</p>
        {decisions.map(d=><div key={d.entityId} className="text-xs"><span className="break-all">{d.entityId} · {d.reference}</span><button className="ml-2 text-sky-300" onClick={()=>{setDecisions(decisions.filter(q=>q.entityId!==d.entityId));setHostedOpenings(hostedOpenings.filter(o=>o.hostEntityId!==d.entityId));setFinishes(finishes.filter(f=>f.hostEntityId!==d.entityId));setFinishUndo([]);setFinishPreview(null);}}>Undo this wall</button></div>)}
        <details><summary>Hosted opening proposals ({hostedOpenings.length})</summary>
          <p className="text-sm text-slate-400">Select an accepted host wall. Offset is measured along its accepted direction from the framing reference start. These are clear void proposals; rough openings, headers and door/window products need further decisions.</p>
          <label>Opening type<select className={input} value={openingKind} onChange={e=>setOpeningKind(e.target.value as HostedOpening['kind'])}><option value="window">Window</option><option value="door">Door</option></select></label>
          {([['offsetText','Opening offset'],['widthText','Opening width'],['sillText','Opening sill'],['headText','Opening head'],['sourceLabel','Opening source reference']] as const).map(([key,label])=><label className="block text-sm" key={key}>{label}<input className={input} disabled={key==='sillText'&&openingKind==='door'} value={key==='sillText'&&openingKind==='door'?'0 m':openingValues[key]} onChange={e=>setOpeningValues({...openingValues,[key]:e.target.value})} /></label>)}
          <button className={button} disabled={!decisions.some(d=>d.entityId===selectedId)||busy} onClick={addOpening}>Add opening proposal</button>
          {hostedOpenings.map(o=><div key={o.id} className="my-2 text-xs"><p>{o.kind} · {o.widthText} wide · sill {o.sillText} · head {o.headText}</p><p className="break-all">{o.hostEntityId} · {o.sourceLabel}</p><button className="text-sky-300" onClick={()=>setHostedOpenings(hostedOpenings.filter(q=>q.id!==o.id))}>Remove opening proposal</button></div>)}
        </details>
        <details><summary>Dynamic wall finishes ({finishes.length})</summary>
          <p className="text-sm text-slate-400">Choose a layer on an accepted wall. Thickness changes its panel geometry; appearance changes its surface rendering. Framing and source references stay fixed. Original recipes remain evidence; choices are designer proposals, not certified products.</p>
          <label>Finish layer<select className={input} value={finishDraft.target} onChange={e=>{setFinishPreview(null);setFinishDraft({...finishDraft,target:e.target.value});}}>{drawingAssembly(decisions.find(d=>d.entityId===selectedId)?.assemblyId??assemblyId).layers.filter(l=>l.id==='gypsum'||l.id==='siding').map(l=><option key={`${l.id}/${l.side}`} value={`${l.id}/${l.side}`}>{l.label} · {l.side}</option>)}</select></label>
          {([['thicknessText','Finish panel thickness'],['label','Finish appearance name'],['note','Finish decision note']] as const).map(([key,label])=><label key={key} className="block text-sm">{label}<input className={input} value={finishDraft[key]} onChange={e=>{setFinishPreview(null);setFinishDraft({...finishDraft,[key]:e.target.value});}} /></label>)}
          <label className="block text-sm">Finish color<input className="block" type="color" value={finishDraft.color} onChange={e=>{setFinishPreview(null);setFinishDraft({...finishDraft,color:e.target.value});}} /></label>
          <label className="block text-sm">Surface roughness<input className={input} type="number" min="0" max="1" step=".05" value={Number.isFinite(finishDraft.roughness)?finishDraft.roughness:''} onChange={e=>{setFinishPreview(null);setFinishDraft({...finishDraft,roughness:e.target.valueAsNumber});}} /></label>
          <div className="flex flex-wrap gap-2"><button className={button} disabled={!decisions.some(d=>d.entityId===selectedId)||busy} onClick={previewFinish}>Preview finish change</button><button className={button} disabled={!finishPreview} onClick={()=>{if(finishPreview)commitFinishes(finishPreview);}}>Apply finish change</button><button className={button} disabled={!finishPreview} onClick={()=>setFinishPreview(null)}>Discard finish preview</button><button className={button} disabled={!finishUndo.length} onClick={()=>{setFinishes(finishUndo[finishUndo.length-1]);setFinishUndo(finishUndo.slice(0,-1));setFinishPreview(null);}}>Undo finish change</button></div>
          {finishPreview&&<p role="status" className="text-amber-200">Finish preview only. Apply to include it in the saved review.</p>}
          {finishes.map(f=><div key={finishKey(f)} className="my-2 text-xs"><p className="break-all">{f.hostEntityId} · {f.layerId}/{f.side} · {f.thicknessText} · {f.appearance.label}</p><p>{f.note}</p><button className="text-sky-300" onClick={()=>commitFinishes(finishes.filter(q=>finishKey(q)!==finishKey(f)))}>Restore base finish</button></div>)}
        </details>
        <button className={button} onClick={exportSource}>Export source review</button>
      </>}
    </aside>
    <section className="min-w-0 space-y-4 p-4" aria-label="Drawing evidence workspace">
      <div className="rounded border border-slate-700 bg-slate-900 p-3"><h2 className="font-semibold">Source geometry · model space</h2><p className="text-sm text-slate-400">{imported?'Click a line to inspect its source identity. Curves are display approximations; omitted entities are listed in decode coverage.':'Load a DWG to inspect its original layers and geometry.'}</p>
        <svg role="img" aria-label="Imported source drawing" viewBox={`${bounds.x} ${-bounds.y-bounds.h} ${bounds.w} ${bounds.h}`} className="h-[48vh] min-h-[280px] w-full">
          {matching.length>displayed.length&&<text x={bounds.x+bounds.w*.03} y={-bounds.y-bounds.h*.95} fill="#fbbf24" fontSize={bounds.w*.014}>Preview limited to 10,000 entities. Isolate layers; all decoded entities remain retained.</text>}
          {displayed.map(e=><g key={e.id}><polyline points={e.points.map(p=>`${p[0]},${-p[1]}`).join(' ')} fill="none" stroke={selectedId===e.id?'#fbbf24':e.straight?'#94a3b8':'#64748b'} strokeWidth={selectedId===e.id?3:1} vectorEffect="non-scaling-stroke" /><polyline points={e.points.map(p=>`${p[0]},${-p[1]}`).join(' ')} fill="none" stroke="transparent" strokeWidth="9" vectorEffect="non-scaling-stroke" data-source-id={e.id} onClick={()=>selectSource(e.id)} style={{cursor:'pointer'}}><title>{e.handle} · {e.layer} · {e.type}</title></polyline></g>)}
          {points.map(p=><circle key={p.id} cx={p.drawing[0]} cy={-p.drawing[1]} r={Math.max(bounds.w,bounds.h)*.004} fill="#38bdf8"><title>{p.id}</title></circle>)}
        </svg>
      </div>
      {acceptedRegistration&&<div className="rounded border border-slate-700 p-3"><h2 className="font-semibold">4 · Wall assembly preview</h2><p className="text-sm text-slate-400">Selected candidate plus accepted interpretations. Toggle physical assembly layers to inspect proposed voids. Header layout is schematic; structural sizing remains unresolved.</p><div className="flex flex-wrap gap-3">{(Object.keys(layerColors) as Layer[]).map(layer=><label key={layer} className="text-sm"><input type="checkbox" checked={shownLayers.includes(layer)} onChange={e=>setShownLayers(e.target.checked?[...shownLayers,layer]:shownLayers.filter(l=>l!==layer))} /> {layer}</label>)}</div><WallPreview walls={previewWalls} parts={parts.filter(p=>shownLayers.includes(p.layer))} finishes={displayedFinishes} sourceId={imported?.source.id??''} /></div>}
      {pdf&&<details><summary>PDF reference: {pdf.name}</summary><object data={pdf.url} type="application/pdf" className="h-[65vh] w-full"><a href={pdf.url} target="_blank" rel="noreferrer">Open local PDF reference</a></object><a href={pdf.url} target="_blank" rel="noreferrer" className="text-sky-300">Open PDF in a separate tab</a></details>}
    </section>
  </div>;
}
function WallPreview({walls,parts,finishes,sourceId}:{walls:Wall[];parts:ReturnType<typeof generateWall>;finishes:FinishChoice[];sourceId:string}) {
  const coords=walls.flatMap(w=>[w.start,w.end]);
  const minX=coords.length?Math.min(...coords.map(p=>p[0])):0,maxX=coords.length?Math.max(...coords.map(p=>p[0])):4,minY=coords.length?Math.min(...coords.map(p=>p[1])):0,maxY=coords.length?Math.max(...coords.map(p=>p[1])):4;
  const x=(minX+maxX)/2,y=(minY+maxY)/2,span=Math.max(maxX-minX,maxY-minY,4);
  return <div className="h-[42vh]"><Canvas key={`${x}:${y}:${span}`} camera={{position:[x+span,span,y+span],far:1000}}><color attach="background" args={['#0f172a']} /><ambientLight intensity={1.5} /><directionalLight position={[x+5,10,y+5]} intensity={2} />{parts.map(p=>{const finish=finishes.find(f=>`${sourceId}:${f.hostEntityId}:wall`===p.owner&&f.layerId===p.layer&&f.side===p.surfaceSide);return <mesh key={p.id} position={[p.center[0],p.center[2],p.center[1]]} rotation={[0,-p.rotation,0]}><boxGeometry args={[p.size[0],p.size[2],p.size[1]]} /><meshStandardMaterial color={finish?.appearance.color??layerColors[p.layer]} roughness={finish?.appearance.roughness??.8} transparent={p.layer==='cavity'||p.layer==='membrane'} opacity={p.layer==='cavity'?.15:p.layer==='membrane'?.4:1} /></mesh>;})}<OrbitControls target={[x,1.5,y]} makeDefault /></Canvas></div>;
}
