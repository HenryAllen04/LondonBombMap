'use client';
import {useRef} from 'react';
export default function Compare({onMix}){
 const output=useRef(null),slider=useRef(null);
 function set(value){slider.current.value=value;output.current.textContent=`${Math.round(value*100)}% historical`;onMix(value);}
 return <section className="change-direction"><span className="change-eyebrow">03 / SAME PLACE, TWO VIEWS</span><h2>Switch the site back.</h2><p>Keep the neighbourhood in place while replacing the modern buildings inside the outline with the earlier terrace layout.</p><label className="change-era">Historical view <output ref={output}>100% historical</output><input ref={slider} aria-label="Historical view" type="range" min="0" max="1" step=".01" defaultValue="1" onChange={e=>set(Number(e.target.value))}/></label><div className="change-era-buttons"><button onClick={()=>set(0)}>Today</button><button onClick={()=>set(1)}>Historical layout</button></div><p>Only the two terrace envelopes are modelled. Their uniform height is an illustration, not a reconstruction.</p></section>;
}
