export const createHistory=present=>({present,past:[],future:[],group:null,time:0});
export function recordChange(history,present,{label='Edit',group=null,time=Date.now()}={}){
 const coalesce=group&&group===history.group&&time-history.time<600&&!history.future.length;
 return {present,past:coalesce?history.past:[...history.past,{value:history.present,label}].slice(-60),future:[],group,time};
}
export function undoChange(history){
 const last=history.past.at(-1);if(!last)return history;
 return {present:last.value,past:history.past.slice(0,-1),future:[...history.future,{value:history.present,label:last.label}],group:null,time:0};
}
export function redoChange(history){
 const next=history.future.at(-1);if(!next)return history;
 return {present:next.value,past:[...history.past,{value:history.present,label:next.label}],future:history.future.slice(0,-1),group:null,time:0};
}
