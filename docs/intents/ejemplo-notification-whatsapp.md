# Intent de ejemplo: nuevo canal WhatsApp en Notification (escenario S2)

> Ejemplo de uso de [E7](../E7-architectural-intent.md). Archivo de trazabilidad: al usarlo de verdad, copiarlo a `intents/AAAA-MM-DD-notification-whatsapp.md` con el resultado.

```
ARCHITECTURAL INTENT

Module:
Notification

Responsibility:
Communicate business events to customers through the right channel.

Secret:
Available channels and their delivery providers, templates and the per-tier channel policy.

Owned data:
notification_log.

Allowed dependencies:
platform (config, event bus); customer/contract (CustomerDirectory.getContactInfo);
events of Customer, Request and Payment (read-only).

Forbidden dependencies:
Tables of other modules (customer_*, payment_*, request_*).
Imports of internals of other modules (only modules/<m>/contract).
Payment provider names or types in message texts.
Provider URLs or keys in code.

Public contract (do not change without ADR):
send(customerId, template, params)
broadcast(filter, message)
list(customerId?)

Quality constraints:
- implement the new channel as an adapter of ChannelPort under modules/notification/adapters/whatsapp
- provider URL/key come from platform/config; add the config keys with development defaults only there
- channel enabled by configuration; no scattered if(flag) checks
- no new abstraction: ChannelPort already exists (email and sms are the existing variants)
- no unmanaged SATD
- behavior of email and sms unchanged (characterization tests stay green)

Evidence required:
unit test with a fake ChannelPort + contract test of the adapter with a fake HTTP + FF1..FF8 green

Task:
Add WhatsApp as a third notification channel for gold-tier customers when a payment is captured.

Before coding, answer: which module owns this? which contract do you touch? which change scenario does it improve (S2)?
```

**Resultado esperado (meta del escenario S2):** el cambio toca **1 módulo** (Notification) + configuración; AS-IS: 7 archivos en 3 áreas.
