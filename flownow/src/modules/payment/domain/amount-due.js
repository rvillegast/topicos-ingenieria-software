// Monto a cobrar de una solicitud en CLP: descuento comercial y bono.
// ATENCIÓN: esta regla pertenece al módulo Request (política comercial, ADR-001); vive aquí sólo hasta el paso 9
// del plan de refactoring, donde Request pasa a calcular el monto y Payment lo recibe ya resuelto.
const GOLD_BONUS_THRESHOLD = 1000000;
const GOLD_BONUS = 5000;

exports.amountDue = ({ amount, discount, tier }) => {
  let due = amount;
  if (discount > 0) due = due - due * discount;
  if (tier === 'gold' && due > GOLD_BONUS_THRESHOLD) due = due - GOLD_BONUS; // HACK(TD-003): bono comercial acordado por teléfono con ventas
  return due;
};
