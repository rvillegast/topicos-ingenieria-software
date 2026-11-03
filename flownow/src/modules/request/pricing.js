// Precio de una solicitud: monto a cobrar en CLP con el descuento comercial por tier y el bono.
// Es política de Request (ADR-001): Payment recibe el monto ya resuelto y no conoce estas reglas.
const GOLD_BONUS_THRESHOLD = 1000000;
const GOLD_BONUS = 5000;

exports.amountDue = ({ amount, discount, tier }) => {
  let due = amount;
  if (discount > 0) due = due - due * discount;
  if (tier === 'gold' && due > GOLD_BONUS_THRESHOLD) due = due - GOLD_BONUS; // HACK(TD-003): bono comercial acordado por teléfono con ventas
  return due;
};
