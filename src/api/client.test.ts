import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { fetchJson, getBaseUrl, LumeApiError } from './client';
import { server, TEST_BASE_URL } from '../test/server';

describe('fetchJson', () => {
  it('uses the configured base URL', () => {
    expect(getBaseUrl()).toBe(TEST_BASE_URL);
  });

  it('returns parsed JSON and sends a JSON body', async () => {
    server.use(
      http.post(`${TEST_BASE_URL}/echo`, async ({ request }) => {
        expect(request.headers.get('content-type')).toBe('application/json');
        return HttpResponse.json({ received: await request.json() });
      })
    );
    await expect(fetchJson('/echo', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      received: { a: 1 },
    });
  });

  it('throws LumeApiError with the FastAPI detail string', async () => {
    server.use(
      http.get(`${TEST_BASE_URL}/bad`, () =>
        HttpResponse.json({ detail: 'unknown output id' }, { status: 400 })
      )
    );
    const error = await fetchJson('/bad').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LumeApiError);
    expect(error).toMatchObject({ status: 400, isClientError: true });
    expect((error as LumeApiError).message).toBe('400: unknown output id');
  });

  it('joins 422 validation messages', async () => {
    server.use(
      http.post(`${TEST_BASE_URL}/invalid`, () =>
        HttpResponse.json(
          { detail: [{ msg: 'too big', loc: ['body'], type: 'x' }, { msg: 'not finite' }] },
          { status: 422 }
        )
      )
    );
    await expect(fetchJson('/invalid', { method: 'POST', body: {} })).rejects.toThrow(
      '422: too big; not finite'
    );
  });

  it('keeps non-JSON error bodies and marks 503 as retryable', async () => {
    server.use(
      http.get(`${TEST_BASE_URL}/busy`, () => new HttpResponse('Service busy', { status: 503 }))
    );
    const error = (await fetchJson('/busy').catch((e: unknown) => e)) as LumeApiError;
    expect(error.body).toBe('Service busy');
    expect(error.isClientError).toBe(false);
  });
});
