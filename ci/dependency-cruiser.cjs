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
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
  },
};
