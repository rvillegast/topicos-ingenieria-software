// Customer reacciona a los pagos. Es el dueño de `total_spent` y `tier` (ADR-002): Payment ya no los escribe.
const db = require('../../db');
const bus = require('../../platform/events');
const paymentEvents = require('../payment/contract/events');
const customerEvents = require('./contract/events');

const GOLD_THRESHOLD = 2000000;   // política de tiers (razón de cambio de Customer)

let registered = false;
exports.register = () => {
  if (registered) return; registered = true;
  bus.subscribe(paymentEvents.CAPTURED, async (e) => {
    const { customerId, amount } = e.payload;
    const c = db.prepare('SELECT total_spent, tier, crm_id FROM customers WHERE id = ?').get(customerId);
    db.prepare('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?').run(amount, customerId);
    if (c.total_spent + amount > GOLD_THRESHOLD && c.tier !== 'gold') {
      db.prepare("UPDATE customers SET tier = 'gold' WHERE id = ?").run(customerId);
      await customerEvents.publishTierChanged({ customerId, tier: 'gold', crmId: c.crm_id });
    }
  }, 'customer.registerSpend');
  bus.subscribe(paymentEvents.REFUNDED, (e) => {
    db.prepare('UPDATE customers SET total_spent = total_spent - ? WHERE id = ?').run(e.payload.amount, e.payload.customerId);
  }, 'customer.registerRefund');
};
