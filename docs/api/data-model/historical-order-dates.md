# Mantenimiento de fechas históricas

La herramienta modifica exclusivamente `orders.ordered_at` de exactamente 1.000
pedidos `DATASET`, identificados por UUID y `dataset_order_id`. No crea pedidos ni
modifica el schema, el importador, los indicadores o las relaciones.

## Estado confirmado de la ampliación

La ejecución de `apply` finalizó correctamente en Neon y actualizó las fechas de
1.000 pedidos `DATASET`.

Las verificaciones posteriores confirmaron:

- 1.000 IDs históricos únicos y ninguna fecha inválida.
- Período histórico del 01/06/2026 al 29/10/2026.
- Los 35 pedidos `APP` siguen presentes.
- 19 correspondencias exactas entre `id_pedido` y `fecha` del CSV y los pedidos.

No se realizó una comparación independiente de los 1.000 pares CSV–Neon. Las 19
correspondencias comprobadas son un muestreo, no una verificación exhaustiva.
Existe un backup externo con los timestamps originales para recuperación; debe
conservarse intacto y fuera de Git.

## Entradas y modos

- CSV definitivo: `docs/api/data-model/fechas.csv`, `id_pedido;fecha`, rango inclusivo
  01/06/2026–29/10/2026. Las fechas representan medianoche en
  `America/Argentina/Buenos_Aires` (03:00 UTC en ese rango).
- Backup original externo, versión 1: `databaseHost`, `databaseName`, `source`,
  UUID, ID externo y fecha UTC con seis decimales. No sobrescribirlo ni subirlo a Git.
  No utilizar ese backup como fixture de PostgreSQL local.
- `dry-run`: conserva su contrato anterior; exige fechas originales y solo lee.
- `apply`: estado original completo → fechas del CSV; estado aplicado → sin cambios.
- `restore`: estado aplicado completo → fechas originales; estado original → sin cambios.
- Filas neutrales (original igual a propuesta) no se actualizan. Estados mixtos,
  identidades incorrectas o fechas inesperadas abortan antes del UPDATE.

El plan se construye en memoria; no se genera otro archivo persistente. El backup
solo respalda fechas e identidades: no permite reconstruir otros campos ni probar
que estos no cambiaron desde su creación.

## CLI independiente

Desde `backend/`, con `HISTORICAL_DATES_DATABASE_URL` configurada explícitamente en
la sesión mediante el mecanismo seguro habitual, sin imprimirla ni incluirla en
argumentos. No existe fallback a `DATABASE_URL` y no se carga `.env` ni Prisma.
La importación del CLI no inicia conexiones.

Ejemplo de sintaxis (los marcadores deben sustituirse por valores aprobados):

```powershell
.\node_modules\.bin\tsx.cmd src/prisma/historical-order-dates-cli.ts `
  --mode dry-run --csv '<CSV_APROBADO>' --backup '<BACKUP_APROBADO>' `
  --host '<HOST_APROBADO>' --port '<PUERTO>' `
  --database '<BASE_APROBADA>' --user '<USUARIO_APROBADO>'
```

Se comprueban URL, usuario y metadatos del backup antes de crear el pool; luego,
base, usuario y resolución de las tablas `public.orders` y `public.order_items`.
Los destinos remotos requieren `sslmode=verify-full` y validación del certificado.
El usuario y la contraseña deben estar presentes explícitamente en la URL.

### Endpoint directo aprobado para esta corrección

Se conserva la coincidencia exacta habitual de host y base. La única excepción
direccional admite el backup con host
`ep-aged-flower-b6l0x43i-pooler.c-2.sa-east-1.aws.neon.tech` y conexión a
`ep-aged-flower-b6l0x43i.c-2.sa-east-1.aws.neon.tech`, exclusivamente cuando ambas
bases son `neondb`. No se normalizan hostnames ni se admiten otros pares por patrón.
La dirección inversa no está admitida como excepción.

El backup se lee intacto y su SHA256 se calcula sobre sus bytes originales. Las
confirmaciones usan el host real de conexión directo y los hashes originales; una
confirmación generada para el pooled no sirve para el directo. Puerto, rol, URL y
TLS conservan sus validaciones anteriores.

Desde `backend/`, después de aprobar proyecto `S2601-EcoBite`, branch `production`,
compute y rol, configurar `HISTORICAL_DATES_DATABASE_URL` mediante el mecanismo
seguro habitual, con el host directo y `sslmode=verify-full`. `$neonUser` debe
contener el rol previamente aprobado, sin derivarlo automáticamente de la URL.
Comprobar que el puerto aprobado es `5432` antes de usar este comando:

```powershell
if (-not $env:HISTORICAL_DATES_DATABASE_URL -or
    [string]::IsNullOrWhiteSpace($neonUser)) {
  throw 'Faltan la conexión dedicada o el rol aprobado.'
}
.\node_modules\.bin\tsx.cmd src/prisma/historical-order-dates-cli.ts `
  --mode dry-run `
  --csv '..\docs\api\data-model\fechas.csv' `
  --backup 'C:\Users\Sigrid\EcoBite-backups\historical-order-dates-before-update.json' `
  --host 'ep-aged-flower-b6l0x43i.c-2.sa-east-1.aws.neon.tech' `
  --port 5432 --database neondb --user $neonUser
if ($LASTEXITCODE -ne 0) {
  throw 'Dry-run fallido: conservar stage, reason y code para revisión.'
}
```

Se espera `mode=dry-run`, `matched=1000` y `changed=0`, con destino y hashes
correctos. La excepción de host no verifica por sí sola proyecto y branch ni
autoriza escrituras: `apply` y `restore` requieren autorización específica.

El reporte devuelve hashes SHA-256 de los bytes exactos del CSV y backup y las
confirmaciones para `apply` y `restore`. Para escribir se requiere el modo explícito
y `--confirm '<CONFIRMACION_EXACTA>'`, vinculada a operación, host, puerto, base,
usuario y ambos hashes. Cambiar cualquier entrada invalida la confirmación.
Se rechazan opciones duplicadas o desconocidas. Nunca imprimir la URL o errores
crudos del driver. La salida del CLI omite credenciales y causas internas.

La confirmación del CLI no reemplaza la autorización humana. **No ejecutar contra
Neon ni otros destinos remotos sin autorización específica posterior.** La identidad
del proyecto y branch debe verificarse además por un mecanismo aprobado; una URL,
el nombre de base y los IDs no bastan para distinguir una copia del mismo dataset.

## Transacción y controles

`apply` y `restore` usan una conexión dedicada y `REPEATABLE READ READ WRITE`, con
`FOR NO KEY UPDATE` sobre los históricos, en orden de UUID. No se bloquea la tabla
completa ni se usa `SKIP LOCKED`. Los nuevos pedidos `APP` pueden continuar.

Los límites son: conexión 3 s (CLI), espera de bloqueo 3 s, sentencia 15 s y
transacción inactiva 15 s. Los tres últimos se fijan localmente en la transacción.
No hay reintentos automáticos. Un único UPDATE parametrizado cruza UUID, ID
externo, `DATASET` y fecha esperada, y su SET contiene únicamente `ordered_at`.
Se verifican conteos, fechas finales, los demás campos y los ítems antes del commit.
Las consultas son por conjuntos, sin una consulta por pedido.

Los originales se conservan como texto UTC con seis decimales y se envían como
parámetros `timestamptz`; nunca se convierten a `Date` de JavaScript. Las lecturas
usan `to_char(... AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.
Los snapshots de otros atributos y de ítems se comparan como texto generado por
PostgreSQL, conservando también los decimales.

Estos bloqueos no impiden nuevos `DATASET` ni todos los cambios independientes en
sus relaciones. El snapshot no congela otros escritores. Coordinar una ventana sin
importaciones ni modificaciones de históricos; no es necesario detener pedidos APP.
Antes de Neon deben revisarse triggers, RLS y permisos efectivos. Preferir un rol
con SELECT necesario y UPDATE limitado a `ordered_at`.

## Integración local verificada

Los siete tests de integración con PostgreSQL local fueron aprobados. El
procedimiento siguiente se conserva como referencia para futuras ejecuciones
autorizadas.

Se usa únicamente `127.0.0.1:5433`, base y usuario `ecobite_test`, contenedor
`ecobite-postgres-test`, PostgreSQL 18. El guard verifica la versión mayor; la versión
18.6 indicada debe comprobarse en el entorno local antes de ejecutar.

La suite conserva los cinco tests de dry-run y agrega dos: ciclo completo
`apply → repetición → restore → repetición` y rollback tras un UPDATE real cuando
falla la verificación. Crea `pg_temp.orders` con 1.000 DATASET y un APP sintéticos y
`pg_temp.order_items` con 1.001 ítems y FK real hacia los pedidos temporales.
El fixture no copia defaults ni triggers que puedan escribir en tablas permanentes.
Solo lee la definición de `public.orders`; no modifica sus registros.

Se verifican timestamps originales `.123456`, `.000001` y `.999999`, medianoche
argentina con timezone de sesión distinto, APP intacto, demás atributos y relaciones
intactos, repetición segura, atomicidad y liberación de la conexión. `max: 1` y
`search_path=pg_temp` mantienen las operaciones en la misma sesión; el cierre del
pool elimina las tablas temporales.

En tu PowerShell local, desde `backend/`, luego de configurar la URL dedicada sin
exponer la contraseña y comprobar contenedor, puerto y versión:

```powershell
if (-not $env:HISTORICAL_DATES_TEST_DATABASE_URL) {
  throw 'Falta la URL local dedicada; no utilizar DATABASE_URL como alternativa.'
}
$previousHistoricalWrites = $env:HISTORICAL_DATES_TEST_ALLOW_WRITES
try {
  $env:HISTORICAL_DATES_TEST_ALLOW_WRITES = 'yes'
  .\node_modules\.bin\jest.cmd --config test/jest-historical-order-dates.json --runInBand --no-cache --coverage=false --watch=false --watchAll=false
  if ($LASTEXITCODE -ne 0) { throw 'Falló la integración: conservar el error y revisar.' }
} finally {
  $env:HISTORICAL_DATES_TEST_ALLOW_WRITES = $previousHistoricalWrites
}
```

`HISTORICAL_DATES_TEST_DATABASE_URL` debe señalar exclusivamente al destino local
anterior, con usuario `ecobite_test` y sin parámetros de URL. No usa la variable del
CLI ni la del proyecto. Las credenciales nunca deben pegarse en reportes.

Esta integración todavía no demuestra concurrencia entre sesiones ni todas las
FK/triggers del schema productivo. Una tabla temporal no es visible desde otra
conexión. Esa prueba queda pendiente: requeriría un fixture compartido y autorización
adicional para objetos persistentes descartables. No crearlos con esta suite.
La integración invoca las funciones con un pool aislado; no ejecuta el CLI contra
`public.orders`. No probar el CLI de escritura sobre los tres pedidos permanentes
locales ni con el CSV o backup reales.

## Recuperación

- Antes del commit, cualquier fallo provoca intento de rollback. La liberación se
  intenta siempre; fallos secundarios no ocultan el principal y se descartan
  conexiones inutilizables.
- Si falla COMMIT, el resultado se informa como `unknown`: podría haberse confirmado.
  No repetir a ciegas; verificar el estado con consultas de lectura autorizadas.
- Si COMMIT terminó y falla la limpieza, se informa `committed`. No confundirlo con
  una reversión de datos.
- Después de un apply confirmado, usar restore autorizado con el mismo CSV y backup.
  Restore verifica el estado aplicado, cambia solo la fecha y exige igualdad exacta
  con los originales, incluidos microsegundos. No sobrescribe otros atributos.
- No hay recuperación automática de un estado parcial o diferente. Investigar antes
  de cualquier acción manual. El dry-run anterior solo acepta el estado original;
  su rechazo tras aplicar no demuestra por sí solo un fallo de la actualización.
