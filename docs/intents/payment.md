# Intent: módulo Payment

> Basado en §13 y en [E2](../E2-arquitectura-to-be.md) / [`modules/payment.md`](../modules/payment.md). Usar como base para toda tarea sobre Payment.

```
ARCHITECTURAL INTENT

Module:
Payment

Responsibility:
Manage the payment lifecycle: charge, refund, retry and report status.

Secret:
Provider-specific payment execution (SDK, tokenization, statuses, errors), retry policy,
currency/FX policy, internal transaction states and persistence.

Owned data:
payment_payments (Payment, Transaction).

Allowed dependencies:
platform (config, event bus, Money). Nothing else: Payment is a leaf module.

Forbidden dependencies:
Any other module, its tables or its contracts (customer_*, request_*, notification_*, reporting_*).
Provider SDK imports or provider names outside modules/payment/adapters (only exception: http/legacy-presenter, TD-010).
Hard-coded URLs, keys or FX rates.

Public contract:
createPayment(cmd)
refundPayment(paymentId, amount?)
retryPayment(paymentId, token)
getPaymentStatus(paymentId)
Events (v1): PaymentCaptured, PaymentFailed, PaymentRefunded, PaymentActionRequired
(no provider fields in payloads; amountBase in base currency).

Quality constraints:
- no circular dependency
- no unmanaged SATD (TODO/FIXME/HACK/TEMP/WORKAROUND must cite TD-xxx)
- provider configuration externalized
- provider types must not leak outside the adapter
- every new abstraction must name its change pressure
- behavior preserved by characterization tests (write them first)
- new functions CCN <= 10

Evidence:
unit tests + contract tests (events/schemas) + FF1/FF2/FF2b/FF3/FF5/FF6/FF7/FF8 + ADR-001/003/004
```
