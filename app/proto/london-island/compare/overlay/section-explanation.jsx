'use client';
import {COLOUR_CLASSES} from '@/lib/map-colours';
export default function SectionExplanation({building,section,filled}){
 const p=section?.properties,category=COLOUR_CLASSES.find(c=>c.id===p?.category),site=p?.evidenceBasis?.endsWith('-site');
 return <div className="section-explanation" aria-label="What this section means">
  <strong>{category?`${category.name} · ${category.label}`:section?'Unknown section':filled?'Colours extended to the building edges':'Historical damage beneath this building'}</strong>
  {filled?<>
   <p>{category?`${(p.coverage*100).toFixed(1)}% of the building is shown ${category.name.toLowerCase()}. This display share comes from ${(p.sourceCoverage*100).toFixed(1)}% ${site?'coverage of the linked historical site':'direct map overlap with this building'}.`:section?'No usable colour was found for this building or its linked site, so it stays grey.':'The detected colours fill the complete object, with clean divisions based on their broad locations and relative matched areas.'}</p>
   <p>The extended colours and straight divisions are display estimates. Choose Exact overlap to see the original evidence; filling a surface does not establish additional damage.</p>
  </>:<p>{category?`This part of today’s footprint overlaps that colour on the historical map: ${(p.coverage*100).toFixed(1)}% of the building footprint.`:section?'This part has no usable colour evidence. It can include unclassified paper, the watermark band or land outside the selected area. Grey does not mean undamaged.':'Each colour marks its actual overlap with today’s footprint. Even a small patch can appear without colouring the whole building.'}</p>}
  <p>{building.properties.display.rebuilt?'This is a replacement site. The colours refer to the earlier site, not damage to the current flats.':'We have not established whether this modern building survives from the historical map.'} These sections are not individual flats, floors or surveyed historical walls.</p>
 </div>;
}
