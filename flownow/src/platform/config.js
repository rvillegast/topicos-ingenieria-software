// Todo se lee al ACCEDER (no al cargar el módulo): así el entorno puede cambiar en pruebas y en caliente.
// Configuración tipada de FlowNow (decisión: de dónde vienen URLs, claves, tasas y flags).
// Es el ÚNICO lugar del código que puede contener URLs y valores por defecto de desarrollo (FF5).
// En producción (NODE_ENV=production) las claves y secretos son obligatorios: no hay defaults.
const env = process.env;
const isProd = () => env.NODE_ENV === 'production';

// Valor de ambiente obligatorio en producción; en desarrollo/pruebas cae a un default NO secreto.
const secret = (name, devDefault) => {
  if (env[name]) return env[name];
  if (isProd()) throw new Error(`Falta la variable de entorno ${name}`);
  return devDefault;
};
const text = (name, devDefault) => env[name] || devDefault;

module.exports = {
  port: env.PORT || 3000,
  dbFile: env.DB_FILE || ':memory:',

  // Flags: se leen al acceder (no al cargar), para poder cambiarlos en pruebas y en caliente.
  flags: {
    get enableSms() { return env.ENABLE_SMS === '1'; },
    get useBackupProvider() { return env.USE_BACKUP_PROVIDER === '1'; },
    get useNewReports() { return env.USE_NEW_REPORTS !== '0'; },
  },

  security: {
    get tokenSecret() { return secret('TOKEN_SECRET', 'dev-only-token-secret'); },
    get adminEmail() { return text('ADMIN_EMAIL', 'admin@flownow.cl'); },
    get adminPassword() { return secret('ADMIN_PASSWORD', 'admin123'); },
  },

  // Tipo de cambio: pesos chilenos por unidad de moneda extranjera (TD-002: sigue siendo un valor fijo).
  fx: { rates: { get USD() { return Number(env.FX_USD || 950); }, get EUR() { return Number(env.FX_EUR || 1030); } } },

  providers: {
    stripey: { get apiKey() { return secret('STRIPEY_API_KEY', 'sk_test_dev_placeholder'); } },
    payfast: { get payUrl() { return text('PAYFAST_PAY_URL', 'https://api.payfast.cl/v1/pay'); } },
    hubcrm: { get baseUrl() { return text('HUBCRM_BASE_URL', 'https://api.hubcrm.com/v2'); } },
    erp: { get baseUrl() { return text('ERP_BASE_URL', 'https://erp.acme-internal.net/api'); } },
    mailblast: {
      get sendUrl() { return text('MAILBLAST_SEND_URL', 'https://api.mailblast.io/v3/send'); },
      get from() { return text('MAIL_FROM', 'no-reply@flownow.cl'); },
    },
    smsgo: {
      get sendUrl() { return text('SMSGO_SEND_URL', 'https://api.smsgo.com/send'); },
      get apiKey() { return secret('SMSGO_API_KEY', 'smsgo_test_dev_placeholder'); },
    },
  },
};
