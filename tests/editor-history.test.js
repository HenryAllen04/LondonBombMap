import {describe,it,expect} from 'vitest';
import {createHistory,recordChange,undoChange,redoChange} from '../lib/editor-history';

describe('editor undo history',()=>{
 it('restores the complete prior document, including manual corrections and reviews',()=>{
  const original={adjustment:{east:3},colours:{strokes:[{label:5}],reviews:{building:'checked'}}};
  const automatic={...original,colours:{automatic:{version:1},strokes:[],reviews:{}}};
  const changed=recordChange(createHistory(original),automatic,{label:'automatic colours'});
  expect(undoChange(changed).present).toEqual(original);
  expect(redoChange(undoChange(changed)).present).toEqual(automatic);
  expect(changed.past[0].label).toBe('automatic colours');
 });
 it('coalesces a slider gesture but separates unrelated edits',()=>{
  let h=createHistory(0);
  h=recordChange(h,1,{group:'coverage',time:100});
  h=recordChange(h,2,{group:'coverage',time:200});
  expect(undoChange(h).present).toBe(0);
  h=recordChange(h,3,{group:'alignment',time:250});
  expect(undoChange(h).present).toBe(2);
  h=recordChange(h,4,{group:'alignment',time:1000});
  expect(undoChange(h).present).toBe(3);
 });
 it('drops redo after a new edit, and handles empty and bounded history',()=>{
  let h=createHistory(0);expect(undoChange(h)).toBe(h);expect(redoChange(h)).toBe(h);
  for(let i=1;i<=70;i++)h=recordChange(h,i);
  expect(h.past).toHaveLength(60);
  h=undoChange(h);expect(h.future).toHaveLength(1);
  h=recordChange(h,100);expect(h.future).toHaveLength(0);
  expect(undoChange(h).present).toBe(69);
 });
});
