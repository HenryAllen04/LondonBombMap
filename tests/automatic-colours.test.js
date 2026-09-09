import {describe,it,expect} from 'vitest';
import {automaticPixelLabel,generateMask,newColours,EXCLUDED,encodeMask,decodeMask} from '../lib/map-colours';
const pixels=(w,h,colour)=>Uint8ClampedArray.from(Array.from({length:w*h},()=>[...colour,255]).flat());
const settings=()=>({...newColours({x:0,y:0,width:7,height:7},{snapshot:'test'}),automatic:{version:1},minPatch:1});

describe('automatic paper colours',()=>{
 it.each([
  [[47,44,62],1],[[74,57,161],2],[[201,44,50],3],[[218,76,152],4],[[224,149,62],5],[[220,199,61],6],
  [[211,190,155],0],[[230,220,195],0],[[45,110,66],0],[[245,245,245],0],
 ])('classifies %j as %i',(rgb,label)=>expect(automaticPixelLabel(...rgb)).toBe(label));
 it('keeps broad black fills while rejecting a one-pixel ink line',()=>{
  const s=settings(),rgba=pixels(7,7,[240,230,210]);
  for(let y=0;y<7;y++)rgba.set([47,44,62,255],(y*7+3)*4);
  expect(generateMask(rgba,s).every(v=>v===0)).toBe(true);
  const black=generateMask(pixels(7,7,[47,44,62]),s);
  expect(black[24]).toBe(1);
 });
 it('retains manual overrides and exclusions when recalculating automatic colours',()=>{
  const s=settings(),rgba=pixels(7,7,[224,149,62]);
  s.samples=[{id:'manual',category:'doubtful',rgb:[224,149,62],scope:'area',point:[2,2]}];
  s.strokes=[{id:'brush',label:2,radius:1,points:[[3.5,3.5]]}];
  const mask=generateMask(rgba,s,[{x:0,y:0,width:1,height:7}]);
  expect(mask[1]).toBe(3);expect(mask[24]).toBe(2);expect(mask[0]).toBe(EXCLUDED);
  const saved=JSON.parse(JSON.stringify({...s,runs:encodeMask(mask)}));
  expect(generateMask(rgba,saved,[{x:0,y:0,width:1,height:7}])).toEqual(mask);
  expect(decodeMask(saved.runs,49)).toEqual(mask);
 });
});
