'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Plus,Minus,RotateCcw,RotateCw,Layers3} from 'lucide-react';
import {COLOUR_CLASSES} from '@/lib/map-colours';
import {Button,EvidenceBadge,Notice,RangeField,ToggleGroup,Toolbar} from '@/components/system/components';
import './surface.css';

const INITIAL={layer:'paper',opacity:.7,scope:'sheet',buildings:true,river:true,dirt:true,height:1,drag:'orbit'};
const LAYERS=[['paper','Wartime sheet','The original map, aligned to Pimlico'],['damage','Damage colours','Saved area, on ground and roofs'],['modern','Modern map','Buildings, streets and the Thames']];
const VIEWS=[['island','Island'],['top','Overhead'],['detail','Damage close-up']];
export default function Surface({config,definition}){
  const host=useRef(null),engine=useRef(null),latest=useRef(INITIAL);
  const [settings,setSettings]=useState(INITIAL),[view,setView]=useState('island'),[stats,setStats]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  latest.current=settings;
  useEffect(()=>{
    const abort=new AbortController();let scene,cancelled=false;
    setStats(null);setError('');
    const timeout=setTimeout(()=>abort.abort(new Error('The island took too long to load. Please retry.')),60000);
    import('./scene').then(({createSurface})=>cancelled?null:createSurface(host.current,config,definition,abort.signal)).then(result=>{
      if(!result)return;if(cancelled){result.dispose();return;}
      scene=result;engine.current=scene;scene.update(latest.current);scene.view('island');setView('island');setStats(scene.stats);
      if(!scene.stats.hasPaper)setSettings(s=>({...s,layer:scene.stats.hasDamage?'damage':'modern'}));
    }).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>clearTimeout(timeout));
    return()=>{cancelled=true;clearTimeout(timeout);abort.abort();scene?.dispose();engine.current=null;};
  },[config,definition,attempt]);
  useEffect(()=>{engine.current?.update(settings);},[settings]);
  function change(key,value){setSettings(s=>({...s,[key]:value}));}
  function chooseView(next){setView(next);engine.current?.view(next);}
  return <main className="lb-app surface-study">
    <header className="surface-header"><a href="/" className="surface-brand"><Layers3 size={20}/> London Before</a><span>PIMLICO · SHEET 88</span><a href="/proto/london-island/compare/overlay">Map editor <ArrowUpRight size={14}/></a></header>
    <section className="surface-heading"><div><span className="surface-eyebrow">A PIECE OF THE CITY</span><h1>Pimlico, lifted from London.</h1></div><p>The streets above. The earth below.<br/>A wartime map, in its modern place.</p></section>
    <div className="surface-workspace">
      <aside className="surface-sidebar" aria-label="Island appearance">
        <fieldset disabled={!stats}><legend>ON THE SURFACE</legend>
          <ToggleGroup appearance="list" className="surface-layer-options" aria-label="Surface layer" value={settings.layer} onChange={layer=>change('layer',layer)}>
            {LAYERS.map(([id,label,note])=><ToggleGroup.Item key={id} value={id} disabled={id==='paper'&&!stats?.hasPaper||id==='damage'&&!stats?.hasDamage}><span>{label}</span><small>{note}</small></ToggleGroup.Item>)}
          </ToggleGroup>
        </fieldset>
        {settings.layer==='paper'&&<fieldset disabled={!stats} className="surface-paper-controls"><legend>MAP OVERLAY</legend>
          <RangeField label="Paper opacity" min={0} max={1} step={.05} value={settings.opacity} onChange={opacity=>change('opacity',opacity)} format={v=>`${Math.round(v*100)}%`}/>
          <label className="lb-field">Paper extent<select value={settings.scope} onChange={e=>change('scope',e.target.value)}><option value="sheet">Whole sheet preview</option><option value="selection">Saved selection only</option></select></label>
          <p>{settings.scope==='sheet'?'Exploratory placement beyond the locally checked area. The river remains visible.':'Uses the exact selection and alignment saved in the map editor.'}</p>
        </fieldset>}
        <fieldset className="surface-toggles" disabled={!stats}><legend>THE ISLAND</legend>
          {[['buildings','3D buildings'],['river','River Thames'],['dirt','Dirt underside']].map(([id,label])=><label key={id}><input type="checkbox" checked={settings[id]} onChange={e=>change(id,e.target.checked)}/>{label}</label>)}
          <RangeField className="surface-height" label="Building height" min={1} max={4} step={.25} value={settings.height} onChange={height=>change('height',height)} format={v=>`${v}×`}/>
        </fieldset>
        <a className="surface-source" href={definition.source.url} target="_blank" rel="noreferrer"><svg viewBox={`${config.selection.x-25} ${config.selection.y-25} ${config.selection.width+50} ${config.selection.height+50}`} role="img" aria-label="Original map around the saved Pimlico selection"><image href={definition.source.url} width={definition.source.width} height={definition.source.height}/></svg><span>The original record <ArrowUpRight size={14}/></span></a>
        <a className="surface-editor-link" href="/proto/london-island/compare/overlay">Adjust map alignment <ArrowUpRight size={14}/></a>
      </aside>
      <section className="surface-stage" aria-label="Pimlico island preview">
        <div className="surface-stage-top">
          <ToggleGroup className="surface-views" aria-label="Island viewpoints" value={view} onChange={chooseView}>{VIEWS.map(([id,label])=><ToggleGroup.Item key={id} value={id} disabled={!stats}>{label}</ToggleGroup.Item>)}</ToggleGroup>
          <EvidenceBadge className="surface-evidence">Provisional alignment</EvidenceBadge>
        </div>
        <div className="surface-canvas" ref={host}/>
        {!stats&&!error&&<Notice className="surface-message">Assembling Pimlico…</Notice>}
        {error&&<Notice tone="alert" className="surface-message"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(n=>n+1)}>Retry island</Button></Notice>}
        <div className="surface-stage-bottom">
          <div className="surface-map-caption"><strong>{view==='detail'?'Cambridge Street · Alderney Street':'Pimlico & the Thames'}</strong><span>{stats?`${stats.buildings.toLocaleString('en-GB')} modern building components`:'Loading modern geometry'}</span></div>
          <Toolbar aria-label="Camera controls">
            <Button size="icon" disabled={!stats} aria-label="Rotate left" onClick={()=>engine.current?.rotate(-20)}><RotateCcw size={17}/></Button>
            <Button size="icon" disabled={!stats} aria-label="Rotate right" onClick={()=>engine.current?.rotate(20)}><RotateCw size={17}/></Button>
            <Button size="icon" disabled={!stats} aria-label="Zoom out" onClick={()=>engine.current?.zoom(1.25)}><Minus size={17}/></Button>
            <Button size="icon" disabled={!stats} aria-label="Zoom in" onClick={()=>engine.current?.zoom(.8)}><Plus size={17}/></Button>
            <Button disabled={!stats} aria-pressed={settings.drag==='pan'} onClick={()=>change('drag',settings.drag==='pan'?'orbit':'pan')}>{settings.drag==='pan'?'Pan':'Orbit'}</Button>
          </Toolbar>
        </div>
        <div className="surface-gesture">Drag to {settings.drag} · scroll to zoom · arrow keys to pan</div>
      </section>
    </div>
    <div className="surface-notes"><p>{stats?.sourceError|| (settings.layer==='damage'?'Historical area colours retain their position, including outside today’s buildings. Roof colours show overlap, not historical identity.':settings.layer==='paper'?'The paper uses the saved geographic alignment. Only the outlined selection has local checks; the rest is an exploratory preview.':'Modern footprints and building parts use source heights where available, or estimated heights. The cut, earth depth and river recess are illustrative.')}</p>{settings.layer==='damage'&&<ul className="surface-key" aria-label="Damage key">{COLOUR_CLASSES.map(c=><li key={c.id}><i style={{background:c.colour}}/>{c.label}</li>)}</ul>}<details><summary>Sources & model details</summary><p>Modern buildings: Overture {stats?.release??'2026-08-19.0'}, including building parts. Heights use the source value, 3 m per supplied floor, or an illustrative 8 m fallback. The rectangle is a display cut within the captured data, not an official Pimlico boundary. Roads, parks and water come from the saved OpenFreeMap snapshot.</p><p>The original paper and colour preview share the saved editor alignment. Automatic damage colours are limited to the saved selection; obscured or unclassified pixels remain unknown. The underside uses the dirt configuration merged from main (seed 416909661). Earth depth, land thickness and the river recess are display dimensions.</p><a href="/proto/footprint-impact?v=3">Inspect the footprint impact prototypes ↗</a></details></div>
    <footer className="surface-footer"><span>© OpenStreetMap contributors · Overture Maps Foundation · ODbL</span><span>Map via OpenFreeMap · Historical image © The London Archives</span></footer>
  </main>;
}
