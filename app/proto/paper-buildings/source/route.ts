import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  const source = path.join(process.cwd(), '.context/attachments/ie5enA/Screenshot 2026-09-08 at 14.34.47.png');
  try {
    return new Response(await readFile(source), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' } });
  } catch {
    return new Response('Reference image is missing. Choose a local image in the prototype.', { status: 404 });
  }
}
