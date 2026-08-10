import { describe, it, expect } from 'vitest';
import { calculateDistanceKm } from '../../shared/src';

describe('calculateDistanceKm (Haversine)', () => {
  it('devuelve 0 para el mismo punto', () => {
    expect(calculateDistanceKm(4.711, -74.072, 4.711, -74.072)).toBe(0);
  });

  it('Bogotá (4.711, -74.072) a Medellín (6.244, -75.573) ≈ 240-260 km', () => {
    const d = calculateDistanceKm(4.711, -74.072, 6.244, -75.573);
    expect(d).toBeGreaterThan(235);
    expect(d).toBeLessThan(265);
  });

  it('es simétrico', () => {
    const a = calculateDistanceKm(4.711, -74.072, 6.244, -75.573);
    const b = calculateDistanceKm(6.244, -75.573, 4.711, -74.072);
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
  });

  it('Bogotá a suroeste (el Calvario, Meta) ronda los 55-70 km', () => {
    const d = calculateDistanceKm(4.711, -74.072, 4.36, -73.63);
    expect(d).toBeGreaterThan(55);
    expect(d).toBeLessThan(70);
  });
});
