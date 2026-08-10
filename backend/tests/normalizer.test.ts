import { describe, it, expect } from 'vitest';
import { USGSEarthquakeProvider } from '../src/adapters/USGSEarthquakeProvider';
import { SGCEarthquakeProvider } from '../src/adapters/SGCEarthquakeProvider';
import { normalizeEvent } from '../src/adapters';

const USGS_FEATURE = {
  id: 'us7000abcd',
  properties: {
    mag: 4.8,
    place: '10 km ESE of Bogotá, Colombia',
    time: 1723400000000,
    updated: 1723400100000,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd',
    felt: 12,
    tsunami: 0,
    magType: 'mb',
    status: 'reviewed',
    alert: 'green',
    net: 'us',
    code: '7000abcd',
  },
  geometry: { type: 'Point', coordinates: [-74.0, 4.6, 40] },
};

describe('USGS provider: normalización', () => {
  it('convierte una feature GeoJSON al formato interno', () => {
    const provider = new USGSEarthquakeProvider('https://example.test/feed.geojson');
    const event = normalizeEvent((provider as unknown as { normalize(f: unknown): unknown }).normalize(USGS_FEATURE));
    expect(event.source).toBe('usgs');
    expect(event.externalId).toBe('us7000abcd');
    expect(event.magnitude).toBe(4.8);
    expect(event.latitude).toBeCloseTo(4.6);
    expect(event.longitude).toBeCloseTo(-74.0);
    expect(event.depth).toBe(40);
    expect(event.tsunami).toBe(false);
    expect(event.felt).toBe(12);
    expect(event.status).toBe('reviewed');
    expect(event.alertLevel).toBe('green');
    expect(event.sourceUrl).toContain('us7000abcd');
    expect(event.eventTime.getTime()).toBe(1723400000000);
  });

  it('rechaza features sin geometría válida', () => {
    const provider = new USGSEarthquakeProvider('x');
    const bad = { id: 'a', properties: { mag: 3 }, geometry: { coordinates: null } };
    expect((provider as unknown as { normalize(f: unknown): unknown }).normalize(bad)).toBeNull();
  });
});

describe('SGC provider: normalización flexible', () => {
  it('mapea una respuesta ArcGIS FeatureServer', () => {
    const provider = new SGCEarthquakeProvider('https://example.test/arcgis/query');
    const feature = {
      attributes: {
        IDSISMO: 'SGC-2023-123',
        MAGNITUD: 5.1,
        PROFUNDIDAD: 30,
        LUGAR: 'Ansermanuevo, Valle del Cauca',
        FECHA: '2023-01-15T10:00:00.000Z',
        LATITUD: 4.79,
        LONGITUD: -75.99,
      },
      geometry: { x: -75.99, y: 4.79 },
    };
    const result = (provider as unknown as {
      fromFeature(f: unknown): unknown;
    }).fromFeature(feature);
    const event = normalizeEvent(result);
    expect(event.source).toBe('sgc');
    expect(event.externalId).toContain('SGC-2023-123');
    expect(event.magnitude).toBe(5.1);
    expect(event.depth).toBe(30);
    expect(event.place).toBe('Ansermanuevo, Valle del Cauca');
  });

  it('mapea un arreglo plano con fechas dd/mm/yyyy (UTC-5)', () => {
    const provider = new SGCEarthquakeProvider('https://example.test');
    const row = {
      magnitud: 4.2,
      profundidad: 55,
      lugar: 'Zapatoca, Santander',
      fecha: '15/01/2023 14:30:00',
      latitud: 6.8,
      longitud: -73.2,
    };
    const result = (provider as unknown as { fromFlatObject(o: unknown): unknown }).fromFlatObject(row);
    const event = normalizeEvent(result);
    const local = new Date(event.eventTime);
    expect(local.toISOString()).toBe('2023-01-15T19:30:00.000Z'); // 14:30 -05:00
    expect(event.magnitude).toBe(4.2);
    expect(event.latitude).toBeCloseTo(6.8);
  });

  it('descarta filas sin magnitud', () => {
    const provider = new SGCEarthquakeProvider('x');
    const result = (provider as unknown as { fromFlatObject(o: unknown): unknown }).fromFlatObject({
      lugar: 'Sin magnitud',
      latitud: 4,
      longitud: -74,
    });
    expect(result).toBeNull();
  });
});

describe('normalizeEvent', () => {
  it('lanza error para datos inválidos', () => {
    expect(() => normalizeEvent({ externalId: '', source: 'x' })).toThrow();
  });

  it('acepta un evento válido', () => {
    const valid = {
      externalId: 'e1',
      source: 'usgs',
      magnitude: 4.5,
      magnitudeType: 'mb',
      latitude: 4.6,
      longitude: -74,
      depth: 30,
      place: 'Colombia',
      eventTime: new Date(),
      updatedAt: new Date(),
      tsunami: false,
      felt: null,
      alertLevel: null,
      status: 'automatic',
      sourceUrl: null,
      rawData: {},
    };
    expect(normalizeEvent(valid).magnitude).toBe(4.5);
  });
});
