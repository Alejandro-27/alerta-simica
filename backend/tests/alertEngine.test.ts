import { describe, it, expect } from 'vitest';
import { decideAlertLevel, passesThreshold } from '../src/services/alertEngine';

const CONFIG = {
  minimumMagnitude: 4.5,
  maximumDepth: 200,
  alertRadiusKm: 150,
  highMagnitudeThreshold: 5.5,
};

describe('passesThreshold', () => {
  it('aprueba un evento que cumple magnitud y profundidad', () => {
    expect(passesThreshold({ magnitude: 4.8, depth: 40 }, CONFIG)).toBe(true);
  });

  it('rechaza magnitud baja', () => {
    expect(passesThreshold({ magnitude: 3.2, depth: 20 }, CONFIG)).toBe(false);
  });

  it('rechaza profundidad excesiva', () => {
    expect(passesThreshold({ magnitude: 6.0, depth: 500 }, CONFIG)).toBe(false);
  });

  it('no asume peligro por magnitud sola: profundidad alta no alerta', () => {
    expect(passesThreshold({ magnitude: 7.0, depth: 700 }, CONFIG)).toBe(false);
  });
});

describe('decideAlertLevel', () => {
  it('NORMAL sin cercanía', () => {
    const r = decideAlertLevel(
      { magnitude: 4.8, depth: 40, alertLevel: null, distanceKm: 900 },
      CONFIG,
    );
    expect(r.level).toBe('NORMAL');
  });

  it('WARNING dentro del radio', () => {
    const r = decideAlertLevel(
      { magnitude: 4.8, depth: 40, alertLevel: null, distanceKm: 80 },
      CONFIG,
    );
    expect(r.level).toBe('WARNING');
    expect(r.reasons).toContain('distance');
  });

  it('HIGH dentro del radio y magnitud alta', () => {
    const r = decideAlertLevel(
      { magnitude: 5.8, depth: 40, alertLevel: null, distanceKm: 60 },
      CONFIG,
    );
    expect(r.level).toBe('HIGH');
  });

  it('magnitud alta pero lejos => NORMAL (no se asume afectación)', () => {
    const r = decideAlertLevel(
      { magnitude: 6.5, depth: 30, alertLevel: null, distanceKm: 800 },
      CONFIG,
    );
    expect(r.level).toBe('NORMAL');
  });

  it('CRITICAL solo con alerta oficial explícita', () => {
    const r = decideAlertLevel(
      { magnitude: 4.0, depth: 10, alertLevel: 'red', distanceKm: 2000 },
      CONFIG,
    );
    expect(r.level).toBe('CRITICAL');
  });

  it('una magnitud alta sin alerta oficial NUNCA es CRITICAL', () => {
    const r = decideAlertLevel(
      { magnitude: 8.0, depth: 10, alertLevel: null, distanceKm: 50 },
      CONFIG,
    );
    expect(r.level).not.toBe('CRITICAL');
  });
});
