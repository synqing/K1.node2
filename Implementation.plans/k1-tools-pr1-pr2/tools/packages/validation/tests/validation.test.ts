
import { describe, it, expect } from 'vitest';
import { checkTypes, checkConstraints, enforceAudioAccess, type ModelGraph } from '../src/index';

describe('@k1/validation', () => {
  const g: ModelGraph = {
    nodes: [
      {id:1, ports:{in:['color','float'], out:['color']}, props:{centerOrigin:true}},
      {id:2, ports:{in:['color'], out:['color']}},
    ],
    edges: [{from:1, to:2, type:'color'}],
  };
  it('type checks pass on matching ports', () => {
    const v = checkTypes(g);
    expect(v.length).toBe(0);
  });
  it('constraint checks validate centerOrigin', () => {
    const v = checkConstraints(g);
    expect(v.length).toBe(0);
  });
  it('audio enforcement flags raw spectrogram when macros absent', () => {
    const cpp = "float x = spectrogram[3];";
    const v = enforceAudioAccess(cpp);
    expect(v.length).toBe(1);
  });
});
