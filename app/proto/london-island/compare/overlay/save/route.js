import {readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import definition from '@/data/pimlico-overlay-source.json';
import {exportColourOverlay} from '@/lib/map-colours';

const output=()=>path.join(process.cwd(),'data/pimlico-overlay.json');
export async function GET(){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 try{return Response.json(JSON.parse(await readFile(output(),'utf8')),{headers:{'Cache-Control':'no-store'}});}
 catch(e){if(e.code==='ENOENT')return Response.json(null,{headers:{'Cache-Control':'no-store'}});return Response.json({error:'The saved alignment could not be read. Its file has been retained.'},{status:500});}
}
export async function POST(request){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 const origin=request.headers.get('origin');
 if(origin){
  let matches=false;
  try{const url=new URL(origin);matches=url.host===request.headers.get('host')&&url.protocol===new URL(request.url).protocol;}catch{}
  if(!matches)return Response.json({error:'Cross-origin save rejected'},{status:403});
 }
 const text=await request.text();
 if(text.length>2000000)return Response.json({error:'The alignment file is too large.'},{status:413});
 try{
  const config=JSON.parse(text);
  const index=config.colours?JSON.parse(await readFile(path.join(process.cwd(),'public/proto/london-island/building-index.json'),'utf8')):null;
  const artifact=exportColourOverlay(config,definition,index);
  const saved={...config,source:definition.source,savedAt:new Date().toISOString(),artifact};
  const temporary=output()+`.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary,JSON.stringify(saved,null,2)+'\n');await rename(temporary,output());
  return Response.json({path:'data/pimlico-overlay.json',savedAt:saved.savedAt});
 }catch(e){return Response.json({error:e.message},{status:400});}
}
