// Pruebas de contrato del puerto de proveedor de pagos: cada adapter debe cumplirlas (ADR-003).
// Un adapter nuevo se agrega a la lista y hereda la misma batería.
const test = require('node:test');
const assert = require('node:assert');
const providers = require('../../../src/modules/payment/providers');
const { ProviderError, ProviderUnavailableError } = require('../../../src/modules/payment/providers/errors');
const helpers = require('../../../src/utils/helpers');

const STATUSES = ['captured', 'declined', 'action_required', 'unknown'];
const adapters = [providers.byName('stripey'), providers.byName('payfast')];

for (const a of adapters) {
  test(`[${a.name}] charge devuelve un resultado con el vocabulario del dominio`, async () => {
    const r = await a.charge({ amount: 1000, currency: 'CLP', token: 'tok_ok', metadata: {} });
    assert.ok(STATUSES.includes(r.status), `status "${r.status}" fuera del vocabulario del dominio`);
    assert.strictEqual(typeof r.providerRef, 'string');
    assert.strictEqual(typeof r.providerStatus, 'string');
  });
  test(`[${a.name}] expone name, refund y parseWebhook`, () => {
    assert.strictEqual(typeof a.name, 'string');
    assert.strictEqual(typeof a.refund, 'function');
    assert.strictEqual(typeof a.parseWebhook, 'function');
  });
}

test('[stripey] traduce estados del proveedor al vocabulario del dominio', async () => {
  const s = providers.byName('stripey');
  const charge = (token) => s.charge({ amount: 1000, currency: 'CLP', token, metadata: {} });
  assert.strictEqual((await charge('tok_ok')).status, 'captured');
  assert.strictEqual((await charge('tok_declined')).status, 'declined');
  assert.strictEqual((await charge('tok_3ds')).status, 'action_required');
  assert.strictEqual((await charge('tok_ok')).providerStatus, 'succeeded');   // estado crudo sólo para persistencia legacy
});

test('[stripey] traduce errores: conexión -> reintentable; resto -> no reintentable', async () => {
  const s = providers.byName('stripey');
  await assert.rejects(() => s.charge({ amount: 1, currency: 'CLP', token: 'tok_timeout', metadata: {} }),
    (e) => e instanceof ProviderUnavailableError && e.retryable === true && !('type' in e));
  const saved = process.env.STRIPEY_API_KEY; process.env.STRIPEY_API_KEY = '';   // sin clave: el SDK falla por autenticación
  const cfg = require('../../../src/platform/config');
  const orig = Object.getOwnPropertyDescriptor(cfg.providers.stripey, 'apiKey');
  Object.defineProperty(cfg.providers.stripey, 'apiKey', { get: () => '', configurable: true });
  try {
    await assert.rejects(() => s.charge({ amount: 1, currency: 'CLP', token: 'tok_ok', metadata: {} }),
      (e) => e instanceof ProviderError && !(e instanceof ProviderUnavailableError) && e.retryable === false);
  } finally {
    Object.defineProperty(cfg.providers.stripey, 'apiKey', orig);
    if (saved === undefined) delete process.env.STRIPEY_API_KEY; else process.env.STRIPEY_API_KEY = saved;
  }
});

test('[stripey] refund responde { ok } y parseWebhook traduce eventos', async () => {
  const s = providers.byName('stripey');
  assert.deepStrictEqual(await s.refund({ providerRef: 'ch_1', amount: 500 }), { ok: true });
  assert.deepStrictEqual(s.parseWebhook({ type: 'charge.succeeded', data: { object: { id: 'ch_9' } } }), { providerRef: 'ch_9', event: 'captured', providerStatus: 'succeeded' });
  assert.deepStrictEqual(s.parseWebhook({ type: 'charge.failed', data: { object: { id: 'ch_9' } } }), { providerRef: 'ch_9', event: 'declined', providerStatus: 'failed' });
  assert.deepStrictEqual(s.parseWebhook({ type: 'otro', data: { object: { id: 'ch_9' } } }), { providerRef: 'ch_9', event: null, providerStatus: null });
  assert.strictEqual(s.parseWebhook({}), null);
});

test('[payfast] cobra por su URL y no soporta reembolsos', async () => {
  const p = providers.byName('payfast'); const before = helpers.outbox.length;
  const r = await p.charge({ amount: 500, currency: 'USD', token: 'tok_ok' });
  assert.match(r.providerRef, /^pf_/);
  assert.strictEqual(helpers.outbox.length, before + 1);
  assert.deepStrictEqual(helpers.outbox[before].body, { amount: 500, currency: 'USD', token: 'tok_ok' });
  await assert.rejects(() => p.refund({ providerRef: 'pf_1', amount: 1 }), ProviderError);
});

test('selección: flag de respaldo cambia el proveedor activo; el reembolso siempre es del principal', () => {
  assert.strictEqual(providers.active().name, 'stripey');
  process.env.USE_BACKUP_PROVIDER = '1';
  try { assert.strictEqual(providers.active().name, 'payfast'); assert.strictEqual(providers.forRefund().name, 'stripey'); }
  finally { delete process.env.USE_BACKUP_PROVIDER; }
  assert.throws(() => providers.byName('nadie'), /desconocido/);
});
