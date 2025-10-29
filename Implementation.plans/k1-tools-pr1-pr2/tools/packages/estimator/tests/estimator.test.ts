
import { describe, it, expect } from 'vitest';
import { estimateRuntime, calibrate } from '../src/index';
import { graphFromJSON } from '../../graph/src/index';

describe('@k1/estimator', () => {
  const g = graphFromJSON({ directed: true, offsets: [0,1,2], edges: [1,], });
  const kinds = new Uint16Array([1,1]);
  it('estimates runtime', () => {
    const model = { "1": { ops: 500, memReads: 32, memWrites: 8, ioCalls: 0 } };
    const est = estimateRuntime(g, kinds, model);
    expect(est.totalOps).toBe(1000);
    expect(est.ms).toBeGreaterThan(0);
  });
  it('calibrates model', () => {
    const m = calibrate([{nodeKind:"1", us: 200}, {nodeKind:"1", us: 100}]);
    expect(m["1"].ops).toBeGreaterThan(0);
  });
});
