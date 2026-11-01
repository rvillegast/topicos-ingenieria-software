# ADR-004: Forma de integración entre módulos

Status: Propuesto
Context: Los servicios se llaman entre sí en ambos sentidos (6 ciclos) y los controllers atraviesan módulos con SQL. No hay contrato ni versionado.
Architectural concern: Bajo acoplamiento (§4.3) e interoperabilidad (§6.2): ModuleA ↛ InternalData_B; ModuleA → Contract_B.
Decision: Dos formas de integración y nada más. (1) **API síncrona** (fachada `modules/<m>/contract`) cuando el llamador necesita la respuesta (Request→Customer, Request→Payment, Notification→Customer.getContactInfo). (2) **Eventos de dominio** versionados (`schemaVersion`, JSON Schema en `contract/events`) para reacciones (efectos secundarios, proyecciones, sincronizaciones). Reglas: el publicador no conoce a sus consumidores; sólo se importa `modules/<m>/contract`; las dependencias forman un DAG (orden: Payment → Customer → Request → {Notification, Integration, Reporting}); un fallo de consumidor no falla al publicador. Transporte: bus en proceso en `platform`.
Alternatives considered: (a) llamadas directas bidireccionales (hoy). (b) Broker externo (Kafka/Rabbit): sobredimensionado. (c) Sólo eventos, incluso para consultas: introduce espera/latencia sin necesidad. (d) Sólo API: reintroduce el acoplamiento temporal y los ciclos.
Consequences: Se rompen los 6 ciclos; los efectos del pago (aviso, factura, CRM, reporte) se agregan o quitan sin tocar Payment. Costo: consistencia eventual y entrega "al menos intentada" en proceso (TD-009; mitigación: bitácora y reintento; evolución: outbox).
Trade-offs: Flujo menos visible en el código (se compensa con la vista dinámica de E2 §7 y pruebas de contrato).
Evidence / fitness function: FF1 (sin ciclos), FF6 (dependency-cruiser: sólo `contract/` es importable entre módulos), pruebas de contrato de eventos (schema), escenarios S1–S4.
Affected modules: todos.
Date: 2026-11-01
