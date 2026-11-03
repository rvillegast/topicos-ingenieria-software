// Textos de aviso por resultado de pago. Función pura. Secreto de Notification: qué se le dice al cliente.
// El mensaje NO nombra al proveedor de pagos (invariante de ADR-003). Los tipos de evento se pasan como
// argumentos para no depender de los internos del publicador.
exports.paymentMessage = ({ outcome, name, formattedAmount }) => {
  if (outcome === 'captured') return { subject: 'Pago confirmado', body: `Hola ${name}, tu pago de ${formattedAmount} fue procesado.` };
  if (outcome === 'declined') return { subject: 'Pago rechazado', body: `Hola ${name}, tu pago de ${formattedAmount} fue rechazado.` };
  // action_required, proveedor no disponible o resultado desconocido (TD-012: el texto no distingue una caída del proveedor)
  return { subject: 'Pago pendiente', body: `Hola ${name}, tu pago requiere una acción adicional.` };
};
