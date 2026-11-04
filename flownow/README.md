# FlowNow

> **Estado actual:** AS-IS refactorizado parcialmente (slice Payment y sus fronteras; pasos 1–11 de `docs/E3-plan-refactoring.md`). El estado AS-IS original, medido en `docs/baseline/as-is/`, corresponde al commit `7b63efc`. Los síntomas de §14.2 descritos abajo son los del AS-IS; varios ya se corrigieron (ver E8). Variable adicional: `PAYMENT_PROVIDER` selecciona el adapter de pagos.

Aplicación de ejemplo para el Caso DecidArch (§14): plataforma de clientes, solicitudes, pagos, notificaciones, integraciones y reportes. **Está deteriorada a propósito** para ser diagnosticada y recuperada sin reescribirla. No "arreglar" nada fuera del flujo de refactoring del caso.

**Stack:** Node.js ≥ 22 (probado en 24) · Express 5 · SQLite (`node:sqlite`, en memoria por defecto) · `node:test`. Los proveedores externos (Stripey, HubCRM, ERP, mailblast, smsgo) están simulados: no sale tráfico a la red.

```
npm install
npm start          # :3000   (PORT, DB_FILE, ENABLE_SMS=1, USE_BACKUP_PROVIDER=1)
npm test
```

**Configuración** (`src/platform/config.js`): todo sale de variables de entorno; sin ellas rigen defaults de desarrollo no secretos. Con `NODE_ENV=production` son **obligatorias** `STRIPEY_API_KEY`, `TOKEN_SECRET`, `ADMIN_PASSWORD` y `SMSGO_API_KEY`. Opcionales: `PORT`, `DB_FILE`, `ADMIN_EMAIL`, `ENABLE_SMS`, `USE_BACKUP_PROVIDER`, `USE_NEW_REPORTS`, `FX_USD`, `FX_EUR`, `HUBCRM_BASE_URL`, `ERP_BASE_URL`, `PAYFAST_PAY_URL`, `MAILBLAST_SEND_URL`, `MAIL_FROM`, `SMSGO_SEND_URL`.

Login: `POST /auth/login` con `admin@flownow.cl` / `admin123` → token Bearer. Tokens de pago simulados: `tok_ok`, `tok_declined`, `tok_3ds`, `tok_timeout`.

## Síntomas sembrados (§14.2) y dónde verlos

| Síntoma | Ejemplos |
|---|---|
| Lógica de negocio en controladores | `controllers/requestController.js` (`bulkCreate`, `cancel`), `customerController.merge`, `paymentController.retry`, `notificationController.broadcast`, `reportController.dashboard` |
| Clases/métodos enormes | `paymentService.processPayment` (~90 líneas, 8 responsabilidades), `reportService.salesReport` |
| Utilitarios mezclados | `utils/helpers.js` (formato, auth/tokens, HTTP, retry, email + SQL, CSV, descuentos) |
| Valores hard-coded | *(resuelto en el paso 2 del refactoring: ahora en `platform/config.js`)* — quedan umbrales de negocio (H-4) |
| URLs, proveedores y flags dispersos | *(URLs/flags ya centralizados en `platform/config.js`)* `api.hubcrm.com`, `erp.acme-internal.net`, `api.mailblast.io`, `api.smsgo.com`, `api.payfast.cl`; `USE_BACKUP_PROVIDER`, `ENABLE_SMS`, `useNewReports` |
| Acceso directo a tablas desde varios componentes | `db` global importado por controllers, services y helpers; `payments`, `customers` y `requests` se escriben desde 4+ lugares |
| Dependencias circulares | `customerService ↔ requestService ↔ paymentService ↔ notificationService ↔ customerService`; `paymentService ↔ integrationService` |
| Duplicación | descuento por tier y prioridad (service y `bulkCreate`), conversión de moneda, reportes y export CSV, envío SMS |
| Interfaces sin variabilidad | *(eliminadas en el paso 4: `IPaymentGateway`, `GatewayFactory`, `INotifier`; el puerto de pagos que las reemplaza tiene dos adapters reales)* |
| SOLID inconsistente | interfaces rituales junto a `processPayment` monolítico (SRP/OCP/DIP violados); `services` que conocen `db` y HTTP |
| Sin frontera para APIs de terceros | *(paso 4: el SDK y los errores de pagos ya están tras `modules/payment/adapters`)* aún quedan `stripey_status`/`stripey_charge_id` en el esquema y en los textos al cliente, y reportes por `provider` |
| TODO/FIXME/HACK/TEMP/WORKAROUND | 8 marcadores sin ticket en el AS-IS; tras los pasos 1–2 los restantes citan su `TD-xxx` (`scripts/satd-scan.sh --gate flownow/src flownow/test`) |
| Pruebas insuficientes | sólo utilitarios y alta de clientes; **cero** pruebas de pagos, reembolsos, webhooks, cancelación o reportes |

## Probar la API con cURL

Con el servidor levantado (`npm start`). Los datos viven en memoria: se pierden al reiniciar (`DB_FILE=flownow.db npm start` para persistir).

```bash
B=http://localhost:3000

# Helper: JSON con token
api() { curl -s "$@" -H "authorization: Bearer $TOKEN" -H 'content-type: application/json'; echo; }
```

### Health y autenticación

```bash
curl -s $B/health

TOKEN=$(curl -s -XPOST $B/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@flownow.cl","password":"admin123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
```

### Clientes

```bash
api -XPOST $B/customers -d '{"name":"Ana Pérez","email":"ana@x.cl","phone":"+56911112222","tier":"silver"}'
api $B/customers
api $B/customers/1
api -XPUT $B/customers/1 -d '{"tier":"gold","phone":"+56933334444"}'
api -XPOST $B/customers/merge -d '{"keep_id":1,"remove_id":2}'     # sólo admin
curl -s $B/customers/export.csv -H "authorization: Bearer $TOKEN"
```

### Solicitudes

```bash
api -XPOST $B/requests -d '{"customer_id":1,"title":"Migración","description":"Migrar datos","amount":100000}'
api -XPOST $B/requests/bulk -d '{"items":[{"customer_id":1,"title":"A","amount":15000},{"customer_id":1,"title":"B","amount":600000}]}'
api $B/requests
api $B/requests/1
api -XPOST $B/requests/1/status -d '{"status":"in_progress"}'      # new→in_progress|cancelled, in_progress→done|cancelled
api -XPOST $B/requests/1/status -d '{"status":"done"}'             # exige solicitud pagada
api -XPOST $B/requests/1/cancel                                    # reembolsa pagos pagados
```

### Pagos

Tokens simulados: `tok_ok` (aprobado), `tok_declined` (rechazado), `tok_3ds` (requiere acción), `tok_timeout` (error de conexión, reintenta 3 veces). Monedas: `CLP` (por defecto), `USD`, `EUR`.

```bash
api -XPOST $B/payments -d '{"request_id":1,"token":"tok_ok"}'
api -XPOST $B/payments -d '{"request_id":2,"token":"tok_declined","currency":"USD"}'
api $B/payments
api $B/payments/summary
api $B/payments/1
api -XPOST $B/payments/1/refund -d '{"amount":10000}'              # sin amount = reembolso total
api -XPOST $B/payments/2/retry -d '{"token":"tok_ok"}'             # sólo pagos failed/error, máx. 3
```

### Notificaciones

```bash
api $B/notifications
api "$B/notifications?customer_id=1"
api -XPOST $B/notifications/broadcast -d '{"subject":"Aviso","body":"Mantención el sábado","tier":"gold"}'   # tier es opcional
```

### Integraciones (los webhooks no requieren token)

```bash
curl -s -XPOST $B/integrations/webhook/crm -H 'content-type: application/json' \
  -d '{"type":"contact.updated","contact_id":"crm_123","name":"Ana P.","phone":"+56900000000","tier":"gold"}'
curl -s -XPOST $B/integrations/webhook/crm -H 'content-type: application/json' \
  -d '{"type":"contact.deleted","contact_id":"crm_123"}'
curl -s -XPOST $B/integrations/webhook/stripey -H 'content-type: application/json' \
  -d '{"type":"charge.succeeded","data":{"object":{"id":"ch_1001"}}}'
api -XPOST $B/integrations/crm/resync
api $B/integrations/logs
```

> `contact_id` debe coincidir con el `crm_id` del cliente (se ve en `GET /customers/:id`); `ch_1001` con `stripey_charge_id` del pago.

### Reportes

```bash
api $B/reports/dashboard
api "$B/reports/sales"
api "$B/reports/sales?from=2026-01-01&to=2026-12-31"
curl -s "$B/reports/sales?format=csv" -H "authorization: Bearer $TOKEN"
api $B/reports/customers
curl -s "$B/reports/customers?format=csv" -H "authorization: Bearer $TOKEN"
api $B/reports/requests
curl -s "$B/reports/requests?format=csv" -H "authorization: Bearer $TOKEN"
```

### Flujo completo de ejemplo

```bash
api -XPOST $B/customers -d '{"name":"Ana Pérez","email":"ana@x.cl","phone":"+56911112222","tier":"silver"}'
api -XPOST $B/requests  -d '{"customer_id":1,"title":"Migración","amount":100000}'
api -XPOST $B/payments  -d '{"request_id":1,"token":"tok_ok"}'
api -XPOST $B/requests/1/status -d '{"status":"in_progress"}'
api -XPOST $B/requests/1/status -d '{"status":"done"}'
api $B/reports/sales
```
