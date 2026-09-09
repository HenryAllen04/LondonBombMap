'use client';
import ObjectPreview from '../london-island/compare/review/object-preview';

export default function Current({study,onInspect}) {
  return <div className="impact-current">
    <ObjectPreview objects={study.baseline} buildings={study.buildings} completePartitions showFit onSelect={id=>{
      const object=study.baseline.find(f=>f.id===id);
      if(object)onInspect({kind:object.properties.category?'overlap':'neutral',category:object.properties.category,baseline:true});
    }}/>
    <div className="impact-baseline-note"><strong>Existing building preview</strong><span>Same renderer and colour technique: {study.baselineMode}. Historic colour outside the modern model is absent.</span></div>
  </div>;
}
