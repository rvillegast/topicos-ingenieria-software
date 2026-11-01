# Module Contract: Identity

> Plantilla Anexo A · Diseño TO-BE. Ver [E2](../E2-arquitectura-to-be.md).

| Campo | Contenido |
|---|---|
| Module | Identity |
| Responsibility | Autenticar a los operadores y verificar sus tokens. |
| Information secret | Esquema de credenciales (hash, sal, política de contraseñas), formato y firma del token, manejo de roles. |
| Reason to change | Política de seguridad; cambio a OIDC/JWT. |
| Owned data | `identity_users`. |
| Public interface | `authenticate(email, password)`, `verifyToken(token)`, `requireRole(role)`. |
| Incoming dependencies | Gateway HTTP (middleware). |
| Outgoing dependencies | `platform` (config: secreto de firma). |
| Forbidden dependencies | Todos los módulos de negocio; secreto de firma o credenciales literales en el código. |
| Invariants | Nunca se almacena la contraseña en claro; el secreto de firma sólo viene de configuración; `/health` y los webhooks quedan explícitamente exentos y validados por su propio mecanismo. |
| Quality drivers | Modifiability (seguridad aislada) |
| SATD status | sin SATD marcada; hard-coded: secreto de firma y credencial admin sembrada (ver E5, hallazgo H-1) |
| Tests / evidence | Caracterización de login ok/fallido y token inválido; FF5 (sin secretos literales) |
| ADR reference | [ADR-005](../adr/ADR-005-politica-satd-quality-gates.md) |

> *Caso límite de granularidad:* poco código, pero su secreto cambia por razones de seguridad independientes de las de negocio (ver E2 §14).
