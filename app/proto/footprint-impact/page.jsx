import Harness from './harness';
import definition from '@/data/pimlico-overlay-source.json';
import site from '@/data/pimlico-site-example.json';
import config from '@/data/pimlico-overlay.json';
import index from '@/public/proto/london-island/building-index.json';
import {overlayMatrix,invertMatrix,applyMatrix,toPlane} from '@/lib/map-overlay';

export const metadata={title:'Where the footprints diverge · London Before'};

export default async function Page({searchParams}) {
  const params=await searchParams;
  const inverse=invertMatrix(overlayMatrix(config,definition.pivot)),r=config.selection;
  const features=index.features.filter(f=>{
    const points=(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat(2).map(p=>applyMatrix(inverse,toPlane(p)));
    return Math.max(...points.map(p=>p[0]))>=r.x&&Math.min(...points.map(p=>p[0]))<=r.x+r.width&&Math.max(...points.map(p=>p[1]))>=r.y&&Math.min(...points.map(p=>p[1]))<=r.y+r.height;
  });
  const v=Number(params.v);
  return <Harness initial={Number.isInteger(v)&&v>=1&&v<=4?v-1:0} config={config} definition={definition} site={site} index={{features,fingerprints:index.fingerprints,release:index.release}}/>;
}
