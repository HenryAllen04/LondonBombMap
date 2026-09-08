"use client";
import { forwardRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { damageCategories, type DamageCategory } from '@/lib/damage';
import { ARCHIVE_URL } from '@/lib/places';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {variant?:'quiet'|'outline'|'solid';size?:'md'|'icon'};
export const Button = forwardRef<HTMLButtonElement,ButtonProps>(function Button({variant='quiet',size='md',type='button',className='',...props},ref) {
  return <button ref={ref} type={type} className={`lb-button lb-button-${variant} lb-button-${size} ${className}`} {...props}/>;
});
const PlateRoot = forwardRef<HTMLElement,HTMLAttributes<HTMLElement>&{surface?:'raised'|'inset'}>(function Plate({surface='raised',className='',...props},ref) {
  return <section ref={ref} className={`lb-plate lb-plate-${surface} ${className}`} {...props}/>;
});
const PlateHeader = forwardRef<HTMLDivElement,HTMLAttributes<HTMLDivElement>>(function Header({className='',...props},ref) {return <div ref={ref} className={`lb-plate-header ${className}`} {...props}/>;});
const PlateCanvas = forwardRef<HTMLDivElement,HTMLAttributes<HTMLDivElement>>(function Canvas({className='',...props},ref) {return <div ref={ref} className={`lb-plate-canvas ${className}`} {...props}/>;});
const PlateFooter = forwardRef<HTMLElement,HTMLAttributes<HTMLElement>>(function Footer({className='',...props},ref) {return <footer ref={ref} className={`lb-plate-footer ${className}`} {...props}/>;});
export const MapPlate = Object.assign(PlateRoot,{Header:PlateHeader,Canvas:PlateCanvas,Footer:PlateFooter});

export const EvidenceBadge = forwardRef<HTMLSpanElement,HTMLAttributes<HTMLSpanElement>&{status?:'draft'|'unknown'}>(function EvidenceBadge({status='draft',children,className='',...props},ref) {
  return <span ref={ref} className={`lb-evidence lb-evidence-${status} ${className}`} {...props}><i aria-hidden="true"/>{children??(status==='draft'?'Draft overlap':'Not mapped')}</span>;
});

type ReferenceProps = HTMLAttributes<HTMLElement>&{children?:ReactNode;action?:ReactNode};
export const ReferenceCard = forwardRef<HTMLElement,ReferenceProps>(function ReferenceCard({children,action,className='',...props},ref) {
  return <aside ref={ref} className={`lb-reference ${className}`} {...props}>
    <header><span><BookOpen size={15}/> Original record</span>{action}</header>
    <a href="/proto/paper-buildings/source" target="_blank" rel="noreferrer" aria-label="Open original Pimlico crop at full size"><img src="/proto/paper-buildings/source" alt="Pimlico bomb damage map: original coloured historical buildings"/></a>
    <div className="lb-reference-body"><strong>Pimlico · Sheet 88</strong><small>Supplied screenshot · historical building outlines</small>{children}<a href={ARCHIVE_URL} target="_blank" rel="noreferrer">Open archive sheet <ArrowUpRight size={13}/></a><small>Image © The London Archives (City of London)</small></div>
  </aside>;
});

type KeyProps = Omit<HTMLAttributes<HTMLElement>,'onChange'|'defaultValue'> & {value?:DamageCategory|null;defaultValue?:DamageCategory|null;onChange?:(value:DamageCategory|null)=>void};
export const DamageKey = forwardRef<HTMLElement,KeyProps>(function DamageKey({value,defaultValue=null,onChange,className='',...props},ref) {
  const [internal,setInternal] = useState<DamageCategory|null>(defaultValue);
  const selected=value===undefined?internal:value;
  function choose(next:DamageCategory|null) {if(value===undefined)setInternal(next);onChange?.(next);}
  return <section ref={ref} className={`lb-damage-key ${className}`} aria-label="Filter draft damage colours" {...props}>
    <button type="button" aria-pressed={selected===null} onClick={()=>choose(null)}>All colours</button>
    {Object.entries(damageCategories).map(([id,c])=><button type="button" key={id} aria-pressed={selected===id} onClick={()=>choose(selected===id?null:id as DamageCategory)} title={c.label}><i style={{background:c.color}}/><span>{c.short}</span></button>)}
  </section>;
});
