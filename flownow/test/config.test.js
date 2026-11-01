const test = require('node:test');
const assert = require('node:assert');
const config = require('../src/platform/config');

const withEnv = (vars, fn) => {
  const saved = {}; for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return fn(); } finally { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
};

test('desarrollo: defaults no secretos y URLs de proveedores', () => {
  assert.match(config.providers.stripey.apiKey, /^sk_test_/);
  assert.strictEqual(config.providers.hubcrm.baseUrl, 'https://api.hubcrm.com/v2');
  assert.deepStrictEqual(config.fx.rates, { USD: 950, EUR: 1030 });
});

test('las variables de entorno sobreescriben los defaults', () => {
  withEnv({ STRIPEY_API_KEY: 'sk_test_otra', HUBCRM_BASE_URL: 'https://crm.interno/v3' }, () => {
    assert.strictEqual(config.providers.stripey.apiKey, 'sk_test_otra');
    assert.strictEqual(config.providers.hubcrm.baseUrl, 'https://crm.interno/v3');
  });
});

test('producción: claves y secretos son obligatorios (sin defaults)', () => {
  withEnv({ NODE_ENV: 'production', STRIPEY_API_KEY: undefined, TOKEN_SECRET: undefined, ADMIN_PASSWORD: undefined, SMSGO_API_KEY: undefined }, () => {
    assert.throws(() => config.providers.stripey.apiKey, /STRIPEY_API_KEY/);
    assert.throws(() => config.security.tokenSecret, /TOKEN_SECRET/);
    assert.throws(() => config.security.adminPassword, /ADMIN_PASSWORD/);
    assert.throws(() => config.providers.smsgo.apiKey, /SMSGO_API_KEY/);
  });
});

test('los flags se leen al accederlos, no al cargar el módulo', () => {
  assert.strictEqual(config.flags.enableSms, false);
  withEnv({ ENABLE_SMS: '1' }, () => assert.strictEqual(config.flags.enableSms, true));
  withEnv({ USE_NEW_REPORTS: '0' }, () => assert.strictEqual(config.flags.useNewReports, false));
});
