// Contrato público de eventos de Customer (v1).
const bus = require('../../../platform/events');

exports.TIER_CHANGED = 'Customer.TierChanged';
bus.registerContract(exports.TIER_CHANGED, 1, { customerId: 'number', tier: 'string' });   // crmId es opcional (string)

exports.publishTierChanged = (p) => bus.publish(exports.TIER_CHANGED, p);

exports.REGISTERED = 'Customer.Registered';
bus.registerContract(exports.REGISTERED, 1, { customerId: 'number', name: 'string', email: 'string' });

exports.publishRegistered = (p) => bus.publish(exports.REGISTERED, p);
