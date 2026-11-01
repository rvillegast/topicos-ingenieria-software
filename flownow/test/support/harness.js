// Arnés de pruebas de caracterización: levanta la API real en un puerto efímero (SQLite en memoria)
// y la ejercita sólo por HTTP, de modo que las pruebas sobrevivan a refactorings internos.
const app = require('../../src/server');

let seq = 0;
exports.start = async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch (e) { json = undefined; }
    return { status: res.status, body: json, text };
  };
  const login = await call('POST', '/auth/login', { email: 'admin@flownow.cl', password: 'admin123' });
  const token = login.body.token;
  const api = (method, path, body) => call(method, path, body, token);
  const h = {
    base, token, call, api,
    close: () => new Promise((r) => server.close(r)),
    customer: async (over = {}) => (await api('POST', '/customers', { name: 'Cliente ' + (++seq), email: `c${seq}-${Date.now()}@test.cl`, phone: '+56911112222', ...over })).body,
    request: async (customer_id, amount, over = {}) => (await api('POST', '/requests', { customer_id, title: 'Solicitud', amount, ...over })).body,
    pay: (request_id, token = 'tok_ok', currency) => api('POST', '/payments', { request_id, token, ...(currency ? { currency } : {}) }),
    // atajo: cliente + solicitud (+ pago)
    paid: async (amount, over = {}) => {
      const c = await h.customer(over); const r = await h.request(c.id, amount);
      const p = await h.pay(r.id); return { c, r, p };
    },
    notifications: async (customerId) => (await api('GET', '/notifications?customer_id=' + customerId)).body,
  };
  return h;
};
