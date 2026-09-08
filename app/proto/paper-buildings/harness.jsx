"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Baseline from "../bomb-sites/buildings";
import Paper from "./paper";
import Paired from "./paired";
import Reference from "./reference";
import "../bomb-sites/picker.css";
import "../bomb-sites/prototype.css";
import "./paper.css";

const variants = [Baseline, Paper, Paired, Reference];
const names = ["Buildings", "Paper", "Paired", "Reference"];
export default function Harness({ initial }) {
  const [current, setCurrent] = useState(initial);
  const [replay, setReplay] = useState(0);
  const picker = useRef(null);
  const [source, setSource] = useState({ url: '/proto/paper-buildings/source', name: 'Your Pimlico screenshot', original: true });
  useEffect(() => () => { if (source.url.startsWith('blob:')) URL.revokeObjectURL(source.url); }, [source.url]);
  function useImage(file) {
    setSource({ url: URL.createObjectURL(file), name: file.name, original: false });
  }
  function select(i) {
    setCurrent(i);
    setReplay(n => n + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", i + 1);
    history.replaceState(null, "", url);
  }
  useLayoutEffect(() => {
    function measure() {
      const item = picker.current.querySelector('[data-active]');
      const highlight = picker.current.querySelector('.proto-picker-highlight');
      highlight.style.width = item.offsetWidth + 'px';
      highlight.style.transform = `translateX(${item.offsetLeft}px)`;
    }
    measure();
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => picker.current?.setAttribute('data-ready', '')));
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', measure); };
  }, [current]);
  useEffect(() => {
    function keys(e) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) select(n - 1);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); select((current + (e.key === 'ArrowRight' ? 1 : 3)) % 4);
      } else if (e.key.toLowerCase() === 'r') setReplay(n => n + 1);
    }
    document.addEventListener('keydown', keys);
    return () => document.removeEventListener('keydown', keys);
  }, [current]);
  const Variant = variants[current];
  return <><Variant key={`${current}-${replay}`} source={source} onImage={useImage} /><nav ref={picker} className="proto-picker" aria-label="Prototype variants">
    <span className="proto-picker-highlight" aria-hidden="true" />
    {names.map((name, i) => <button key={name} className="proto-picker-item" data-active={current === i ? '' : undefined} aria-current={current === i ? 'true' : undefined} onClick={() => select(i)}>{name}</button>)}
  </nav></>;
}
