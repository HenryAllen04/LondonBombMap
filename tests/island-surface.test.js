import {describe,it,expect} from 'vitest';
import clipping from 'polygon-clipping';
import {polygonArea} from '@/lib/filled-buildings';
import {splitSurface,unproject,paperUV,selectedArea,project} from '@/components/pimlico-island/geometry';
import {applyMatrix} from '@/lib/map-overlay';

const polygon=(x,y,w,h)=>({type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]].map(unproject)]});

describe('Pimlico island surface',()=>{
  it('cuts overlapping water tiles out of land once, including across the display edge',()=>{
    const region={geometry:polygon(0,0,100,100)};
    const water=[polygon(-10,25,70,30),polygon(40,25,80,30)].map(geometry=>({properties:{layer:'water'},geometry}));
    const result=splitSurface(water,region);
    expect(polygonArea(result.river)).toBeCloseTo(3000,4);
    expect(polygonArea(result.land)).toBeCloseTo(7000,4);
    expect(polygonArea(clipping.intersection(result.river,result.land))).toBeCloseTo(0,5);
    expect(polygonArea(clipping.union(result.river,result.land))).toBeCloseTo(10000,4);
  });
  it('preserves an island inside a river hole as land',()=>{
    const water=polygon(0,0,100,100);
    water.coordinates.push(polygon(40,40,20,20).coordinates[0].slice().reverse());
    const result=splitSurface([{properties:{layer:'water'},geometry:water}],{geometry:polygon(0,0,100,100)});
    expect(polygonArea(result.land)).toBeCloseTo(400,4);
    expect(polygonArea(result.river)).toBeCloseTo(9600,4);
  });
  it('maps source pixels to the same roof and ground UVs without flipping north',()=>{
    const matrix=[1.9,.2,-.3,2.1,-500,200],source={width:2060,height:1290};
    for(const pixel of [[0,0],[2060,1290],[1100,440]]){
      const plane=applyMatrix(matrix,pixel),uv=paperUV([plane[0],-plane[1]],matrix,source);
      expect(uv[0]).toBeCloseTo(pixel[0]/source.width,10);
      expect(uv[1]).toBeCloseTo(1-pixel[1]/source.height,10);
    }
  });
  it('uses the exact saved selection even under rotation and translation',()=>{
    const config={selection:{x:100,y:200,width:50,height:30}},matrix=[0,2,-2,0,10,-50];
    expect(selectedArea(config,matrix)[0][0]).toEqual([[-390,-150],[-390,-250],[-450,-250],[-450,-150],[-390,-150]]);
    const location=[-.14,51.49];expect(project(location)).toEqual([0,0]);
  });
});
