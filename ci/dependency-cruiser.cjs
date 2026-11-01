// Reglas de arquitectura para dependency-cruiser (FF1 y base para FF2/FF3).
// Uso: npx dependency-cruiser@18.7.0 --config ci/dependency-cruiser.cjs <ruta>
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'FF1: el grafo de módulos no puede tener ciclos (§4.3).',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'vendor/' },
  },
};
