import {readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import study from '@/data/pimlico-local-study.json';
import {exportReview} from '@/lib/pimlico-review';
const output=()=>path.join(process.cwd(),'data/pimlico-review.json');
export async function GET(){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 try{return Response.json(JSON.parse(await readFile(output(),'utf8')),{headers:{'Cache-Control':'no-store'}});}
 catch(e){if(e.code==='ENOENT')return Response.json(null);throw e;}
}
export async function POST(request){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 const origin=request.headers.get('origin');
 if(origin){
  let matches=false;
  try{const url=new URL(origin);matches=url.host===request.headers.get('host')&&url.protocol===new URL(request.url).protocol;}catch{}
  if(!matches)return Response.json({error:'Cross-origin save rejected'},{status:403});
 }
 const text=await request.text();if(text.length>1000000)return Response.json({error:'Review is too large'},{status:413});
 try{
  const config=JSON.parse(text),index=JSON.parse(await readFile(path.join(process.cwd(),'public/proto/london-island/building-index.json'),'utf8'));
  const artifact=exportReview(config,index,study),saved={...config,savedAt:new Date().toISOString(),artifact};
  const temporary=output()+`.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary,JSON.stringify(saved,null,2)+'\n');await rename(temporary,output());
  return Response.json({path:'data/pimlico-review.json',savedAt:saved.savedAt,objects:artifact.features.length});
 }catch(e){return Response.json({error:e.message},{status:400});}
}
