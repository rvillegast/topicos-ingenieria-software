# FlowNow (estado AS-IS)

Aplicación de ejemplo para el Caso DecidArch (§14): plataforma de clientes, solicitudes, pagos, notificaciones, integraciones y reportes. **Está deteriorada a propósito** para ser diagnosticada y recuperada sin reescribirla. No "arreglar" nada fuera del flujo de refactoring del caso.

**Stack:** Node.js ≥ 22 (probado en 24) · Express 5 · SQLite (`node:sqlite`, en memoria por defecto) · `node:test`. Los proveedores externos (Stripey, HubCRM, ERP, mailblast, smsgo) están simulados: no sale tráfico a la red.

```
npm install
npm start          # :3000   (PORT, DB_FILE, ENABLE_SMS=1, USE_BACKUP_PROVIDER=1)
npm test
```

Login: `POST /auth/login` con `admin@flownow.cl` / `admin123` → token Bearer. Tokens de pago simulados: `tok_ok`, `tok_declined`, `tok_3ds`, `tok_timeout`.

## Síntomas sembrados (§14.2) y dónde verlos

| Síntoma | Ejemplos |
|---|---|
| Lógica de negocio en controladores | `controllers/requestController.js` (`bulkCreate`, `cancel`), `customerController.merge`, `paymentController.retry`, `notificationController.broadcast`, `reportController.dashboard` |
| Clases/métodos enormes | `paymentService.processPayment` (~90 líneas, 8 responsabilidades), `reportService.salesReport` |
| Utilitarios mezclados | `utils/helpers.js` (formato, auth/tokens, HTTP, retry, email + SQL, CSV, descuentos) |
| Valores hard-coded | secreto de firma, API keys (`config.js`, `notificationService`), tipos de cambio 950/1030, umbrales, `limit 10`, remitente |
| URLs, proveedores y flags dispersos | `api.hubcrm.com`, `erp.acme-internal.net`, `api.mailblast.io`, `api.smsgo.com`, `api.payfast.cl`; `USE_BACKUP_PROVIDER`, `ENABLE_SMS`, `useNewReports` |
| Acceso directo a tablas desde varios componentes | `db` global importado por controllers, services y helpers; `payments`, `customers` y `requests` se escriben desde 4+ lugares |
| Dependencias circulares | `customerService ↔ requestService ↔ paymentService ↔ notificationService ↔ customerService`; `paymentService ↔ integrationService` |
| Duplicación | descuento por tier y prioridad (service y `bulkCreate`), conversión de moneda, reportes y export CSV, envío SMS |
| Interfaces sin variabilidad | `IPaymentGateway`+`GatewayFactory` (1 implementación), `INotifier` (1 implementación) |
| SOLID inconsistente | interfaces rituales junto a `processPayment` monolítico (SRP/OCP/DIP violados); `services` que conocen `db` y HTTP |
| Sin frontera para APIs de terceros | `stripey_status`/`stripey_charge_id` en el esquema y en el texto al cliente, `e.type === 'Stripey…'` en el service, reportes por `provider` |
| TODO/FIXME/HACK/TEMP/WORKAROUND | 8 marcadores, ninguno con ticket (`scripts/satd-scan.sh flownow/src`) |
| Pruebas insuficientes | sólo utilitarios y alta de clientes; **cero** pruebas de pagos, reembolsos, webhooks, cancelación o reportes |
