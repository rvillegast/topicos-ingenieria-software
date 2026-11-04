// Bus de eventos en proceso (ADR-004). Secreto de este módulo: el transporte de los eventos.
// Hoy es sincrónico y en memoria; mañana podría ser una cola sin cambiar a publicadores ni consumidores.
//
// Garantías:
//  - Cada evento viaja en un sobre versionado: { id, type, schemaVersion, occurredAt, payload }.
//  - El publicador no conoce a sus consumidores. `publish` espera a que todos terminen (así el flujo HTTP
//    conserva su comportamiento actual: los efectos ocurren antes de responder).
//  - Aislamiento de fallos: si un consumidor falla, los demás igual reciben el evento y `publish` NO falla.
//    El fallo queda en la bitácora de eventos fallidos (deadLetters) y en el log.
//  - Un payload que viola el contrato registrado es un error del PUBLICADOR: `publish` lanza y no entrega nada.
//  - Lectores tolerantes: los contratos exigen campos mínimos; los campos extra se aceptan siempre.
//
// Deuda aceptada TD-009: sin garantía de entrega ante una caída entre el commit y la publicación
// (no hay outbox). Mitigación: bitácora de eventos fallidos; evolución prevista: outbox/cola.

const handlers = new Map();        // type -> [{ name, fn }]
const contracts = new Map();       // `${type}@${version}` -> { campo: 'string'|'number'|'boolean'|'object' }
const failures = [];               // bitácora acotada de consumidores que fallaron
const MAX_FAILURES = 100;
let logger = (msg) => console.error('[events]', msg);
let counter = 0;

const key = (type, version) => `${type}@${version}`;

exports.subscribe = (type, fn, name = fn.name || 'anonymous') => {
  if (typeof type !== 'string' || !type) throw new TypeError('type debe ser un string no vacío');
  if (typeof fn !== 'function') throw new TypeError('el consumidor debe ser una función');
  const entry = { name, fn };
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(entry);
  return () => { const list = handlers.get(type) || []; const i = list.indexOf(entry); if (i >= 0) list.splice(i, 1); };
};

// Declara el contrato mínimo de una versión de evento: { campo: tipo }. Los campos extra siempre se aceptan.
exports.registerContract = (type, version, fields) => { contracts.set(key(type, version), fields); };

function validate(type, version, payload) {
  const fields = contracts.get(key(type, version));
  if (!fields) return;
  for (const [name, expected] of Object.entries(fields)) {
    const actual = payload[name];
    const ok = expected === 'object' ? actual !== null && typeof actual === 'object' : typeof actual === expected;
    if (!ok) throw new TypeError(`Evento ${type} v${version}: el campo "${name}" debe ser ${expected} (recibido: ${actual === undefined ? 'ausente' : typeof actual})`);
  }
}

function validateArgs(type, payload, schemaVersion) {
  if (typeof type !== 'string' || !type) throw new TypeError('type debe ser un string no vacío');
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) throw new TypeError('schemaVersion debe ser un entero >= 1');
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('payload debe ser un objeto');
  validate(type, schemaVersion, payload);
}

function recordFailure(event, name, e) {
  failures.push({ eventId: event.id, type: event.type, handler: name, error: e && e.message ? e.message : String(e), at: event.occurredAt });
  if (failures.length > MAX_FAILURES) failures.shift();
  logger(`consumidor "${name}" falló con ${event.type}: ${e && e.message}`);
}

exports.publish = async (type, payload, { schemaVersion = 1 } = {}) => {
  validateArgs(type, payload, schemaVersion);
  const event = Object.freeze({ id: `evt_${++counter}`, type, schemaVersion, occurredAt: new Date().toISOString(), payload });
  const result = { id: event.id, delivered: 0, failed: 0 };
  for (const { name, fn } of [...(handlers.get(type) || [])]) {   // copia: suscribirse durante la entrega no altera esta ronda
    try { await fn(event); result.delivered++; }
    catch (e) { result.failed++; recordFailure(event, name, e); }
  }
  return result;
};

exports.deadLetters = () => failures.slice();
exports.configure = ({ logger: l } = {}) => { if (l) logger = l; };
exports._resetForTests = () => { handlers.clear(); contracts.clear(); failures.length = 0; counter = 0; };
