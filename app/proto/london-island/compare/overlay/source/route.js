import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import definition from '@/data/pimlico-overlay-source.json';

export async function GET(){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 try{
  const bytes=await readFile(path.join(process.cwd(),'.context/attachments/Gvxy1M/watermark.png'));
  if(createHash('sha256').update(bytes).digest('hex')!==definition.source.sha256)return new Response('The source image changed. Register it as a new source before aligning.',{status:409});
  return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store'}});
 }catch(e){if(e.code==='ENOENT')return new Response('The watermarked sheet is missing from this workspace.',{status:404});throw e;}
}
