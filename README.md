# ENERGIA360 — Plataforma Inteligente de Gestión, Análisis y Optimización Energética (RD & LATAM)

> **"Entiende tu consumo. Controla tu energía. Reduce tus gastos."**
> **Principio Rector:** *Tu energía. Tus datos. Tu control.*

ENERGIA360 es una plataforma tecnológica **Local-First y Zero-Access** diseñada para hogares, apartamentos, pequeños negocios y empresas en **República Dominicana** (con arquitectura preparada para el Caribe y Latinoamérica).

---

## 1. Arquitectura Híbrida: Local-First + Supabase Zero-Access

- **Procesamiento 100% Local de Facturas:** Los recibos eléctricos (`PDF`, `JPG`, `JPEG`, `PNG`) de **EDESUR, EDENORTE, EDEESTE y CEPM** se analizan directamente en la memoria RAM del navegador mediante `Tesseract.js` y extracción de flujos PDF locales. Los archivos originales se descartan tras el análisis.
- **Bóveda Criptográfica en el Cliente (`IndexedDB` + `Web Crypto API`):**
  - Derivación de clave mediante `PBKDF2-HMAC-SHA256` con `310,000` iteraciones.
  - Cifrado autenticado `AES-256-GCM` con vector de inicialización (`IV`) aleatorio de 96 bits y verificación de integridad `SHA-256`.
  - Las claves privadas tienen `extractable = false` y jamás salen del dispositivo del usuario.
- **Backend en Supabase (`supabase/migrations/20261107000001_init_energia360_schema.sql`):**
  - **RLS (Row-Level Security)** habilitado en todas las tablas del esquema `public`.
  - Almacena únicamente catálogos públicos (pliegos tarifarios de la **Superintendencia de Electricidad - SIE**, catálogo de electrodomésticos e inversores), perfiles básicos de cuenta, métricas anónimas agregadas voluntarias y, opcionalmente, **bloques cifrados E2EE (`encrypted_vault_backups`)** indescifrables para el servidor o los administradores.

---

## 2. Módulos Implementados

1. **Módulo A — Dashboard Principal:** Consumo mensual, promedio diario, proyección de factura, margen frente al escalón crítico de **701 kWh (pérdida de subsidio escalonado SIE)**, índice de eficiencia energética, autonomía de respaldo y gráficos interactivos.
2. **Módulo B — Analizador Inteligente de Facturas:** Carga local de PDF/imágenes o texto de factura digital, detección de formato por distribuidora, pantalla obligatoria de revisión manual campo por campo con etiquetas de procedencia (`Confirmado por el usuario`, `Extraído automáticamente`, `Estimado`, `No disponible`) e historial comparativo.
3. **Módulo C — Calculadora y Simulador de Consumo por Equipos:** 15 categorías, biblioteca orientativa de equipos habituales en República Dominicana (claramente diferenciada de mediciones físicas) y deslizador de horas en tiempo real.
4. **Módulo D — Inteligencia Energética:** Motor de diagnóstico que identifica el salto tarifario de 701 kWh, consumos no explicados (fugas/flotadores de cisterna) y oportunidades en climatización mostrando problema, evidencia, acción, método matemático y nivel de confianza.
5. **Módulo E — Simulador de Ahorro:** Comparación simultánea de hasta 3 escenarios con tablas y gráficos de retorno.
6. **Módulo F — Simulador Solar Fotovoltaico:** Basado en las **Horas Solares Pico (HSP)** de las provincias de República Dominicana (`5.15` a `5.95 kWh/m²/día`), orientación del techo, pérdidas del sistema y 3 escenarios (*Conservador*, *Intermedio*, *Optimista*).
7. **Módulo G — Inversores y Baterías:** Cálculo científico de autonomía durante apagones considerando capacidad en Wh, Profundidad de Descarga (`DoD`) según química (`Plomo-Ácido`, `AGM/Gel`, `Litio LiFePO4`), Estado de Carga (`SoC`) y eficiencia del inversor.
8. **Módulo H — Alertas Inteligentes Configurables:** Control granular de umbrales por tipo de alerta.
9. **Adaptación al Mercado Dominicano (Sección 6):** Pliegos tarifarios `BTS-1` y `BTS-2` de EDESUR, EDENORTE, EDEESTE y tarifa referencial configurable de CEPM.
10. **Experiencia de Demostración Aislada (Sección 12) y Panel Administrativo Zero-Access (Sección 13).**

---

## 3. Configuración con Supabase desde el Inicio

1. Copia el archivo `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Ejecuta la migración y datos semilla en el SQL Editor de tu proyecto Supabase o mediante Supabase CLI:
   - `supabase/migrations/20261107000001_init_energia360_schema.sql`
   - `supabase/seed.sql`
3. Instala dependencias, ejecuta las pruebas automatizadas e inicia el servidor:
   ```bash
   npm install
   npm test
   npm run dev
   ```

