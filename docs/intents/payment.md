# Intent: módulo Payment

> Basado en §13. Usar como base para toda tarea sobre Payment.

```
ARCHITECTURAL INTENT

Module:
Payment

Responsibility:
Manage the payment lifecycle.

Secret:
Provider-specific payment execution and retry policy.

Owned data:
Payment, Transaction.

Allowed dependencies:
CustomerIdentity API.

Forbidden dependencies:
Customer database.
Notification implementation.
Reporting database.

Public contract:
createPayment()
authorizePayment()
capturePayment()
refundPayment()
getPaymentStatus()

Quality constraints:
- no circular dependency
- no unmanaged SATD
- provider configuration externalized
- provider types must not leak outside adapter
- behavior preserved by tests

Evidence:
unit tests + contract tests + architecture rule + ADR
```
