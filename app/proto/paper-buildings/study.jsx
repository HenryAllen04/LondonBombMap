"use client";
import { useRef, useState } from 'react';
import { BookOpen, ChevronDown, Crosshair, Maximize2, RotateCcw, Upload, X } from 'lucide-react';
import { ARCHIVE_URL } from '@/lib/places';
import Modern from './modern';

const colours = [
  { name:'Yellow', short:'Minor blast', meaning:'Minor blast damage', note:'The yellow colouring records blast damage described as minor in nature.', ink:'oklch(.82 .15 94)' },
  { name:'Orange', short:'General blast', meaning:'General blast damage', note:'Orange records general blast damage, not structural damage.', ink:'oklch(.7 .15 48)' },
  { name:'Light red', short:'Repairable', meaning:'Seriously damaged; repairable', note:'Light red records serious damage considered repairable at cost. The scan can make this appear pink.', ink:'oklch(.64 .2 355)' },
  { name:'Dark red', short:'Repair doubtful', meaning:'Seriously damaged; repair doubtful', note:'Dark red records serious damage where repair was considered doubtful.', ink:'oklch(.5 .19 23)' },
  { name:'Purple', short:'Beyond repair', meaning:'Damaged beyond repair', note:'Purple records damage considered beyond repair.', ink:'oklch(.42 .16 293)' },
  { name:'Black', short:'Destroyed', meaning:'Total destruction', note:'Black records total destruction. It does not describe the age or condition of a building standing here today.', ink:'oklch(.24 .012 280)' },
];

function ColourGuide() {
  const [value, setValue] = useState(1);
  const colour = colours[value];
  return <section className="pm-colour-guide" aria-label="Historical map colour guide">
    <div className="pm-dial-wrap"><div className="pm-dial" aria-hidden="true"><div className="pm-needle" style={{transform:`rotate(${-75 + value * 30}deg)`}} /></div><label className="pm-tiny" htmlFor="damage-dial">COLOUR GUIDE</label><input id="damage-dial" type="range" min="0" max="5" step="1" value={value} aria-valuetext={`${colour.name}: ${colour.meaning}`} onChange={e => setValue(Number(e.target.value))} /></div>
    <div className="pm-colour-options" role="group" aria-label="Choose a colour to explain">{colours.map((c,i) => <button key={c.name} aria-pressed={i===value} onClick={() => setValue(i)}><i style={{background:c.ink}}/><span>{c.name}<small>{c.short}</small></span></button>)}</div>
    <div className="pm-colour-meaning" aria-live="polite"><strong>{colour.meaning}</strong><span>{colour.note}</span><a href="https://www.thelondonarchives.org/your-research/research-guides/second-world-war-bomb-damage" target="_blank" rel="noreferrer">Archive key ↗</a></div>
  </section>;
}

function PaperMap({ source, tilt, paperRef, viewportRef, selected, onInspect, closeInspect, focused, onFocus, settings }) {
  const drag = useRef(null), moved = useRef(false);
  const [failed, setFailed] = useState(false), [ratio, setRatio] = useState(1067/672);
  function down(e) {
    if (e.button !== 0 || e.target.closest('button')) return;
    moved.current = false;
    drag.current = { x:e.clientX, y:e.clientY, startX:settings.current.x, startY:settings.current.y, point:e.target.tagName==='IMG'?{x:e.nativeEvent.offsetX/e.target.clientWidth,y:e.nativeEvent.offsetY/e.target.clientHeight}:null };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!drag.current) return;
    const dx=e.clientX-drag.current.x, dy=e.clientY-drag.current.y;
    if (Math.abs(dx)+Math.abs(dy) < 5 && !moved.current) return;
    moved.current = true;
    settings.current.x = drag.current.startX + dx;
    settings.current.y = drag.current.startY + dy;
    paperRef.current.style.setProperty('--paper-x', settings.current.x+'px');
    paperRef.current.style.setProperty('--paper-y', settings.current.y+'px');
  }
  return <div className="pm-paper-view" ref={viewportRef}>
    <div className="pm-paper-heading"><span className="pm-tiny">THE HISTORICAL RECORD</span><strong>{source.original ? 'Pimlico, on paper.' : 'Your original image.'}</strong><span>{source.original ? 'Sheet 88 · supplied screenshot' : source.name}</span></div>
    <div className="pm-paper-surface" tabIndex={0} role="group" aria-label="Paper map. Arrow keys pan; Enter inspects the image centre." onKeyDown={e => {
      const delta = {ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];
      if (delta) {
        e.preventDefault(); e.stopPropagation();
        settings.current.x += delta[0]; settings.current.y += delta[1];
        paperRef.current.style.setProperty('--paper-x',settings.current.x+'px');
        paperRef.current.style.setProperty('--paper-y',settings.current.y+'px');
      } else if (e.key==='Enter') { e.preventDefault(); onInspect({x:.5,y:.5}); }
    }} onPointerDown={down} onPointerMove={move} onPointerUp={() => {if (!moved.current && drag.current?.point) onInspect(drag.current.point);drag.current=null}} onPointerCancel={() => {drag.current=null}}>
      <div ref={paperRef} className="pm-paper-plane" style={{'--paper-tilt':tilt+'deg'}}>
        <img key={source.url} src={source.url} alt={source.original?"Original bomb damage map detail, with individual historical houses coloured yellow, orange, pink, red, purple and black":`Local map image: ${source.name}`} draggable="false" onLoad={e => {setFailed(false);setRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight)}} onError={() => setFailed(true)} />
        {selected && <span className="pm-source-pin" style={{left:selected.x*100+'%',top:selected.y*100+'%'}} aria-hidden="true"><Crosshair size={26}/></span>}
      </div>
    </div>
    {failed && <div className="pm-source-error" role="status">The reference image is unavailable. Use “Sharper image” to choose a local scan.</div>}
    <div className="pm-paper-caption"><span>Image © The London Archives (City of London)</span><span>Drag to pan · zoom to inspect · colour key explains the original ink</span></div>
    {source.original && <div className="pm-source-shortcuts"><button aria-pressed={!focused} onClick={() => onFocus(false)}>Whole crop</button><button aria-pressed={focused} onClick={() => onFocus(true)}><Crosshair size={14}/> Yellow & orange detail</button></div>}
    {selected && <div className="pm-inspector"><div className="pm-inspector-top"><span className="pm-tiny">SOURCE DETAIL</span><button aria-label="Close source detail" onClick={closeInspect}><X size={15}/></button></div><div className="pm-loupe" style={{backgroundImage:`url("${source.url}")`,backgroundPosition:`${88-selected.x*1232}px ${70-selected.y*1232/ratio}px`}}/><p>Read the original colour against the guide above.</p><small>Present-day building match not established.</small></div>}
  </div>;
}

export default function Study({ mode, source, onImage }) {
  const [selected, setSelected] = useState(null), [focused, setFocused] = useState(false);
  const [fileError, setFileError] = useState(''), [copied, setCopied] = useState('');
  const [expanded, setExpanded] = useState(false);
  const paperRef = useRef(null), viewportRef = useRef(null), fileInput = useRef(null), modern = useRef(null);
  const defaultTilt = mode === 'paper' ? 44 : mode === 'paired' ? 26 : 0;
  const settings = useRef({tilt:defaultTilt, zoom:1, x:0, y:0});
  function setValue(name, value) {
    settings.current[name] = value;
    const unit = name==='tilt' ? 'deg' : name==='zoom' ? '' : 'px';
    paperRef.current?.style.setProperty(`--paper-${name}`, value+unit);
    const input = document.getElementById('paper-'+name);
    if (input) { input.value = value; input.parentElement.querySelector('output').value = name==='zoom'?Math.round(value*100)+'%':value+'°'; }
  }
  function focus(detail) {
    setFocused(detail); setSelected(null);
    if (detail) {
      setValue('tilt',0); setValue('zoom',2.4);
      setValue('x',paperRef.current.offsetWidth * .27 * 2.4);
      setValue('y',paperRef.current.offsetHeight * .27 * 2.4);
    } else {
      setValue('tilt',defaultTilt); setValue('zoom',1); setValue('x',0); setValue('y',0);
    }
  }
  async function chooseImage(e) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { setFileError('Choose a PNG, JPEG or WebP image.'); return; }
    if (file.size > 80*1024*1024) { setFileError('Choose an image under 80 MB.'); return; }
    setFileError(''); onImage(file); focus(false);
  }
  async function copyView() {
    const config = JSON.stringify({direction:mode,...settings.current, modern:mode!=='paper'?{tilt:modern.current?.getPitch(),bearing:modern.current?.getBearing(),zoom:modern.current?.getZoom()}:undefined},null,2);
    try { await navigator.clipboard.writeText(config); setCopied('View settings copied'); }
    catch { setCopied(config); }
  }
  const titles = {paper:['The map is the evidence.','Keep the paper, the pen lines and every coloured house. Tilt for atmosphere; flatten and zoom for close reading.'],paired:['The old houses. The city now.','Read the original map beside modern building footprints. Compare the neighbourhood without assuming the buildings are the same.'],reference:['Today’s buildings, with the source in reach.','Explore the modern city in 3D, with the original damage map open beside you.']};
  return <main className={`paper-study pm-${mode}${expanded?' pm-expanded':''}`}>
    <header className="pm-header"><a href="/" className="pm-brand">London<span>Before</span></a><span className="pm-project">PIMLICO <i>/</i> PAPER & PLACE</span><div><button onClick={() => fileInput.current.click()}><Upload size={15}/><span>Sharper image</span></button><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} className="pm-file" aria-label="Choose a sharper map image"/><a href={ARCHIVE_URL} target="_blank" rel="noreferrer"><BookOpen size={16}/><span>Original sheet</span></a></div></header>
    <ColourGuide />
    <section className="pm-workspace" aria-label={`${mode} map study`}>
      <div className="pm-study-title"><span className="pm-tiny">{mode==='paper'?'02 / PAPER FIRST':mode==='paired'?'03 / TWO READINGS':'04 / BUILDINGS FIRST'}</span><h1>{titles[mode][0]}</h1><p>{titles[mode][1]}</p></div>
      <div className="pm-maps">
        {mode!=='paper' && <Modern controller={modern}/>}
        <div className="pm-paper-panel">
          {mode==='reference' && <button className="pm-expand" aria-label={expanded?'Reduce original map':'Expand original map'} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}><Maximize2 size={16}/></button>}
          <PaperMap source={source} tilt={defaultTilt} paperRef={paperRef} viewportRef={viewportRef} selected={selected} onInspect={setSelected} closeInspect={() => setSelected(null)} focused={focused} onFocus={focus} settings={settings}/>
        </div>
      </div>
      <aside className="pm-view-controls" aria-label="View controls"><span className="pm-tiny">VIEW CONTROLS</span><label htmlFor="paper-tilt">Paper tilt <output>{defaultTilt}°</output><input id="paper-tilt" type="range" min="0" max="65" defaultValue={defaultTilt} onInput={e => setValue('tilt',Number(e.currentTarget.value))}/></label><label htmlFor="paper-zoom">Paper zoom <output>100%</output><input id="paper-zoom" type="range" min="0.5" max="4" step="0.05" defaultValue="1" onInput={e => setValue('zoom',Number(e.currentTarget.value))}/></label><div className="pm-control-actions"><button onClick={() => setValue('tilt',0)}>Read flat</button><button aria-label="Reset paper view" onClick={() => focus(false)}><RotateCcw size={15}/></button></div>{mode!=='paper' && <label htmlFor="modern-tilt">Building tilt <output>58°</output><input id="modern-tilt" type="range" min="0" max="70" defaultValue="58" onInput={e => {modern.current?.jumpTo({pitch:Number(e.currentTarget.value)});e.currentTarget.parentElement.querySelector('output').value=e.currentTarget.value+'°';}}/></label>}<button className="pm-copy" onClick={copyView}>Copy view settings</button>{copied && <small role="status">{copied}</small>}</aside>
      <div className="pm-context-note"><span className="pm-note-dot"/><span>{mode==='paper'?'Original image preserved · no inferred house classifications':'Visual comparison · views are not geographically aligned'}<small>{mode==='paper'?'Historical building heights are not known. The paper tilts as one surface.':'Modern buildings are neutral: survival, rebuilding and damage matches need verification.'}</small></span></div>
      {fileError && <div className="pm-file-error" role="alert">{fileError}</div>}
      <details className="pm-extra-key"><summary>Other map markings <ChevronDown size={13}/></summary><p><i/> Green denotes a clearance area, not a damage severity. Blank paper does not prove a house was undamaged. Colours may shift in a scan.</p></details>
    </section>
  </main>;
}
