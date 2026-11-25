import { describe, expect, it, vi } from 'vitest';
import { SupabaseService } from '../database/supabase.service.js';
import { RequestsService } from './requests.service.js';

const CATEGORY_ID = 'c20a61dc-a903-44a4-94c0-5c7b3de8cab1';
const ZONE_ID = 'ad190525-9d10-46c6-9529-2fed9999ad41';
const REQUEST_ID = 'b030244f-aa4b-4f56-9749-0aa419e80950';
const WORKER_ID = '898e7a63-1a4e-47f0-951d-e27975a96df5';

describe('RequestsService compatible requests', () => {
  it('filters open, unexpired requests by the worker categories and zones', async () => {
    const { service, queryCalls } = createService({
      worker_categories: { data: [{ category_id: CATEGORY_ID }], error: null },
      worker_zones: { data: [{ zone_id: ZONE_ID }], error: null },
      categories: { data: [{ id: CATEGORY_ID, name: 'Plomería' }], error: null },
      service_zones: { data: [{ id: ZONE_ID, name: 'Cala Cala', city: 'Cochabamba' }], error: null },
      repair_requests: {
        data: [{
          id: REQUEST_ID,
          title: 'Reparar una fuga',
          description: 'Hay una fuga bajo el lavaplatos de la cocina.',
          category_id: CATEGORY_ID,
          zone_id: ZONE_ID,
          available_from: null,
          available_until: null,
          created_at: '2026-11-17T12:00:00.000Z',
          expires_at: '2026-12-17T12:00:00.000Z',
        }],
        error: null,
      },
    });

    const result = await service.listCompatible(WORKER_ID);
    const requestQuery = queryCalls.get('repair_requests')?.[0];

    expect(result.profileReady).toBe(true);
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].category?.name).toBe('Plomería');
    expect(result.requests[0].zone?.name).toBe('Cala Cala');
    expect(requestQuery.eq).toHaveBeenCalledWith('status', 'open');
    expect(requestQuery.in).toHaveBeenCalledWith('category_id', [CATEGORY_ID]);
    expect(requestQuery.in).toHaveBeenCalledWith('zone_id', [ZONE_ID]);
    expect(requestQuery.gt).toHaveBeenCalledWith('expires_at', expect.any(String));
  });

  it('returns an explicit profile-not-ready state without querying requests', async () => {
    const { service, queryCalls } = createService({
      worker_categories: { data: [], error: null },
      worker_zones: { data: [{ zone_id: ZONE_ID }], error: null },
    });

    await expect(service.listCompatible(WORKER_ID)).resolves.toEqual({
      profileReady: false,
      requests: [],
    });
    expect(queryCalls.has('repair_requests')).toBe(false);
  });

  it('returns signed photos and excludes client address and identity from detail', async () => {
    const { service, queryCalls } = createService({
      worker_categories: { data: [{ category_id: CATEGORY_ID }], error: null },
      worker_zones: { data: [{ zone_id: ZONE_ID }], error: null },
      categories: { data: [{ id: CATEGORY_ID, name: 'Plomería' }], error: null },
      service_zones: { data: [{ id: ZONE_ID, name: 'Cala Cala', city: 'Cochabamba' }], error: null },
      repair_requests: {
        data: {
          id: REQUEST_ID,
          title: 'Reparar una fuga',
          description: 'Hay una fuga bajo el lavaplatos de la cocina.',
          category_id: CATEGORY_ID,
          zone_id: ZONE_ID,
          available_from: null,
          available_until: null,
          created_at: '2026-11-17T12:00:00.000Z',
          expires_at: '2026-12-17T12:00:00.000Z',
        },
        error: null,
      },
      request_attachments: {
        data: [{ id: 'photo-1', storage_path: `${REQUEST_ID}/photo.webp`, uploaded_at: '2026-11-17T12:00:00.000Z' }],
        error: null,
      },
    }, true);

    const result = await service.getCompatibleDetail(WORKER_ID, REQUEST_ID);
    const requestQuery = queryCalls.get('repair_requests')?.[0];

    expect(result.attachments[0].signed_url).toBe('https://storage.example/signed-photo');
    expect(result.category?.id).toBe(CATEGORY_ID);
    expect(result.zone?.id).toBe(ZONE_ID);
    expect(Object.hasOwn(result, 'client_id')).toBe(false);
    expect(Object.hasOwn(result, 'exact_address')).toBe(false);
    expect(requestQuery.select).toHaveBeenCalledWith(
      'id, title, description, category_id, zone_id, available_from, available_until, created_at, expires_at',
    );
    expect(requestQuery.in).toHaveBeenCalledWith('category_id', [CATEGORY_ID]);
    expect(requestQuery.in).toHaveBeenCalledWith('zone_id', [ZONE_ID]);
  });
});

function createService(
  results: Record<string, { data: unknown; error: unknown }>,
  withStorage = false,
) {
  const queryCalls = new Map<string, Record<string, ReturnType<typeof vi.fn>>[]>();
  const supabaseMock = {
    admin: {
      from: vi.fn((table: string) => {
        const query = createQuery(results[table] ?? { data: [], error: null });
        queryCalls.set(table, [...(queryCalls.get(table) ?? []), query]);
        return query;
      }),
      ...(withStorage
        ? {
            storage: {
              from: vi.fn(() => ({
                createSignedUrl: vi.fn().mockResolvedValue({
                  data: { signedUrl: 'https://storage.example/signed-photo' },
                  error: null,
                }),
              })),
            },
          }
        : {}),
    },
  };

  return {
    service: new RequestsService(supabaseMock as unknown as SupabaseService),
    queryCalls,
  };
}

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {} as Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
  };

  for (const method of ['select', 'eq', 'in', 'gt', 'order']) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);

  return query;
}
