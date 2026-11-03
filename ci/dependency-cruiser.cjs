// Reglas de arquitectura para dependency-cruiser. Se ejecutan con ci/rules/arch.js (que aplica el ratchet de FF1).
// Uso directo: npx dependency-cruiser@18.7.0 --config ci/dependency-cruiser.cjs <ruta>
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'FF1: el grafo de módulos no puede tener ciclos (§4.3). Ratchet en ci/ratchets.json hasta llegar a 0.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-sdk-outside-adapter',
      comment: 'FF2: el SDK/tipos del proveedor de pagos sólo pueden importarse desde modules/payment/adapters (ADR-003).',
      severity: 'error',
      from: { pathNot: '(^|/)src/modules/payment/adapters/' },
      to: { path: '(^|/)vendor/stripey' },
    },
    {
      name: 'only-via-contract',
      comment: 'FF6: un módulo sólo puede importar de otro su carpeta contract/ (ADR-004). Los internos no se tocan.',
      severity: 'error',
      from: { path: '(?:^|/)src/modules/([^/]+)/' },
      to: { path: '(?:^|/)src/modules/[^/]+/', pathNot: ['(?:^|/)src/modules/$1/', '(?:^|/)src/modules/[^/]+/contract/'] },
    },
    {
      name: 'payment-only-via-contract',
      comment: 'FF6: desde fuera de Payment sólo se importa modules/payment/contract (más el presentador HTTP de compatibilidad, TD-010, y el esquema que carga db.js).',
      severity: 'error',
      from: { pathNot: '(?:^|/)src/modules/payment/' },
      to: { path: '(?:^|/)src/modules/payment/', pathNot: ['(?:^|/)src/modules/payment/contract/', '(?:^|/)src/modules/payment/http/legacy-presenter\\.js$', '(?:^|/)src/modules/payment/persistence/schema\\.js$'] },
    },
    {
      name: 'payment-is-leaf',
      comment: 'FF6: Payment es una hoja del grafo: no depende de services/, controllers/ ni de otros módulos (ADR-001).',
      severity: 'error',
      from: { path: '(?:^|/)src/modules/payment/' },
      to: { path: '(?:^|/)src/(?:services|controllers)/|(?:^|/)src/modules/(?!payment/)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
  },
};
