const INotifier = require('./INotifier');
const helpers = require('../../utils/helpers');
class EmailNotifier extends INotifier { async send(id, s, b) { return helpers.sendEmail(id, s, b); } }
module.exports = EmailNotifier;
