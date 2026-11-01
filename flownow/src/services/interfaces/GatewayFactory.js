const StripeyGateway = require('./StripeyGateway');
// Factory "para poder cambiar de proveedor"
module.exports = { create(kind) { switch (kind) { case 'stripey': default: return new StripeyGateway(); } } };
