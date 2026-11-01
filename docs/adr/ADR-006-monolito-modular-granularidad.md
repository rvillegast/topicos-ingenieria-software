# ADR-006: Monolito modular y granularidad (7 módulos + platform)

Status: Propuesto
Context: Hay que decidir cuántos módulos y qué unidad de despliegue (§5): `C_total = C_internal + C_coordination`. El sistema mide ~700 LOC, un equipo de 3–4 personas, 2 semanas.
Architectural concern: Bounded Complexity; no premiar "más microservicios, más interfaces, más capas".
Decision: Un único despliegue (monolito modular) con 7 módulos de negocio (Identity, Customer, Request, Payment, Notification, Reporting, Integration) + `platform` mínimo. Las fronteras se imponen en código y CI, no en red. Un módulo existe si oculta una decisión volátil, posee datos propios y se prueba por su contrato.
Alternatives considered: microservicios por módulo (coordinación y despliegue ×7 para poco código); 3 módulos gruesos (mezclan razones de cambio); módulo por clase (explosión de interfaces).
Consequences: Bajo costo operativo; evolución posible hacia extracción (p. ej. Reporting) gracias a eventos versionados. Riesgo: la disciplina depende de FF1/FF3/FF6; por eso son bloqueantes.
Trade-offs: Un despliegue implica un solo fallo conjunto y una BD física compartida (separación lógica).
Evidence / fitness function: grafo TO-BE acíclico (FF1), conteo de aristas y fan-in/out de `dependencias.json`, complejidad por módulo (lizard).
Affected modules: todos.
Date: 2026-11-01
