"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Paper from "./paper";
import Pieces from "./pieces";
import Night from "./night";
import "../bomb-sites/picker.css";
import "../bomb-sites/prototype.css";
import "../paper-buildings/paper.css";
import "../borough-plates/system/tokens.css";
import "../borough-plates/plates.css";

import "./island.css";

const variants = [Paper, Pieces, Night];
const names = ["Paper", "Pieces", "Night"];
export default function Harness({ initial }) {
  const [current, setCurrent] = useState(initial);
  const [replay, setReplay] = useState(0);
  const picker = useRef(null);
  function select(i) {
    setCurrent(i);
    setReplay(n => n + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", i + 2);
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
      if (e.defaultPrevented || e.target.closest('canvas,[role=slider],[role=combobox],[role=menu]') || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 3) select(n - 1);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); select((current + (e.key === 'ArrowRight' ? 1 : 2)) % 3);
      } else if (e.key.toLowerCase() === 'r') setReplay(n => n + 1);
    }
    document.addEventListener('keydown', keys);
    return () => document.removeEventListener('keydown', keys);
  }, [current]);
  const Variant = variants[current];
  return <><Variant key={`${current}-${replay}`} /><nav ref={picker} className="proto-picker island-proto-picker" aria-label="Prototype variants">
    <span className="proto-picker-highlight" aria-hidden="true" />
    {names.map((name, i) => <button key={name} className="proto-picker-item" data-active={current === i ? '' : undefined} aria-current={current === i ? 'true' : undefined} onClick={() => select(i)}>{name}</button>)}
  </nav></>;
}
