import { fitAffine, applyAffine } from './registration.js';

/** @param {number[]} point @param {{pixel: number[], coordinates: number[]}[]} anchors */
export function projectTrace(point, anchors) {
  const model=fitAffine(anchors.map(anchor=>({pixel:anchor.pixel,grid:anchor.coordinates})));
  return applyAffine(model,point).map(value=>Number(value.toFixed(7)));
}
