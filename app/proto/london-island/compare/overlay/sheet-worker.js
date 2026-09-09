import {extractSheet} from '@/lib/sheet-colours';
self.onmessage=({data})=>{
 try{const artifact=extractSheet(new Uint8ClampedArray(data.rgba),data.config,data.definition,progress=>self.postMessage({progress}));self.postMessage({artifact});}
 catch(error){self.postMessage({error:error.message});}
};
