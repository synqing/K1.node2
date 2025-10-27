
import { describe, it, expect } from 'vitest';
import { impactRadius, transitiveClosure, toDot } from '../src/index';

describe('@k1/deps', () => {
  const dg = {
    nodes: ['A','B','C','D','E'],
    edges: [
      {from:'A', to:'B', kind:'code'},
      {from:'B', to:'C', kind:'code'},
      {from:'B', to:'D', kind:'asset'},
      {from:'D', to:'E', kind:'config'},
    ],
    directed: true as const
  };

  it('transitiveClosure grows set', () => {
    const s = transitiveClosure(dg, ['A']);
    expect(s.has('D')).toBe(true);
    expect(s.has('E')).toBe(true);
  });

  it('impactRadius sorts by distance', () => {
    const r = impactRadius(dg, ['B']);
    expect(r[0]).toBe('B');
    expect(r.slice(1)).toEqual(['C','D','E']);
  });

  it('toDot produces edges', () => {
    const dot = toDot(dg);
    expect(dot.includes('A')).toBe(true);
    expect(dot.includes('->')).toBe(true);
  });
});
