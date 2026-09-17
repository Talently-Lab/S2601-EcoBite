# Explicación del Diagrama Entidad-Relación

## 1. Propósito

Definir el modelo de datos del MVP de EcoBite, incluyendo las entidades, atributos, relaciones y restricciones necesarias para soportar las funcionalidades de la plataforma y los KPIs definidos por Data Analyst.

El modelo contempla tanto la operación de la plataforma como la recopilación de los datos necesarios para medir el impacto ambiental de EcoBite.

## Decisiones del modelo

### Identificadores

Todas las claves primarias (PK) y sus correspondientes claves foráneas (FK) utilizarán UUID de forma consistente en todo el modelo de datos.

Esta decisión resuelve una discrepancia detectada en el material proporcionado por Data Analyst: `id_pedido` figura como `UUID` en la matriz y como `INT` en la definición de entidades.

Para mantener la consistencia del modelo, se adopta `UUID` como tipo definitivo. La implementación se realizará mediante Prisma sobre PostgreSQL.

Todas las claves primarias utilizarán UUID y las claves foráneas mantendrán el mismo tipo. En PostgreSQL con Prisma, esto permite generar identificadores únicos sin depender de una secuencia central, evita exponer identificadores consecutivos en URLs o APIs y facilita la integración con servicios, importaciones o futuros procesos distribuidos. El costo es un mayor uso de espacio y almacenamiento en índices respecto de un entero, pero resulta razonable para el volumen esperado del MVP y aporta flexibilidad para futuras necesidades de crecimiento.

## 2. Convenciones

El modelo utiliza las siguientes convenciones:

- Las claves primarias se identifican como `PK`.
- Las claves foráneas se identifican como `FK`.
- Los identificadores utilizan `UUID`.
- Los campos de fecha y hora utilizan tipos compatibles con `DateTime` de Prisma y PostgreSQL.
- Los campos obligatorios se definirán como `NOT NULL`.
- Las restricciones de unicidad se definirán mediante `UNIQUE` cuando corresponda.
- Las relaciones entre entidades se implementarán mediante claves foráneas.
- Las cardinalidades se representan visualmente en el DER mediante notación Crow's Foot.

## 3. Entidades

El modelo de datos contempla las entidades necesarias para representar la operación principal del MVP de EcoBite, incluyendo usuarios, restaurantes, productos, pedidos y detalles de pedidos, así como los datos necesarios para el seguimiento del impacto ambiental.

> Las entidades y sus atributos se encuentran representados en el DER técnico.

## 4. Relaciones y cardinalidades

Las relaciones entre las entidades representan las asociaciones necesarias para soportar las operaciones del MVP.

Las cardinalidades se definen en función de las reglas de negocio y de las necesidades de información identificadas en los requerimientos y KPIs.

El modelo contempla las siguientes cardinalidades:

- Un usuario puede realizar cero o muchos pedidos; cada pedido corresponde a un único usuario.
- Un restaurante puede ofrecer cero o muchos productos; cada producto se asocia a un único restaurante.
- Un restaurante puede recibir cero o muchos pedidos; cada pedido se asocia a un único restaurante.
- Un pedido contiene uno o más detalles de pedido; cada detalle pertenece a un único pedido.
- Un producto puede aparecer en cero o muchos detalles de pedido; cada detalle referencia un único producto.

El DER utiliza Mermaid ER Diagram con notación de cardinalidad basada en Crow's Foot para representar visualmente estas relaciones.

## 5. Restricciones y reglas de integridad

El modelo debe garantizar la integridad y consistencia de los datos mediante:

- Claves primarias únicas.
- Claves foráneas válidas.
- Restricciones de unicidad en campos que no pueden repetirse.
- Campos obligatorios definidos según las reglas de negocio.
- Valores permitidos para campos con estados o categorías.
- Relaciones consistentes entre las entidades.

Las reglas específicas se implementarán mediante Prisma y PostgreSQL.

Las reglas de negocio detalladas que no forman parte de la estructura del modelo se documentarán de forma independiente y no se consideran parte del DER.

## 6. Impacto ambiental y KPIs

El modelo contempla los datos necesarios para permitir el cálculo y seguimiento de los indicadores definidos por Data Analyst.

Entre ellos se incluyen los datos relacionados con pedidos, restaurantes, productos, entregas y las variables necesarias para estimar el impacto ambiental y el ahorro de CO₂.

La estructura definitiva de estos datos debe permitir posteriormente obtener los KPIs sin depender de información que no haya sido registrada durante la operación de la plataforma.

## 7. Implementación

El modelo definido en este documento y representado en el DER será implementado mediante Prisma ORM sobre PostgreSQL.

La estructura de implementación se definirá en:

`backend/prisma/schema.prisma`

Las modificaciones del esquema de base de datos se gestionarán mediante las migraciones de Prisma.

## 8. Diagrama Entidad-Relación

El DER técnico se encuentra en el archivo:

`docs/api/data-model/erd.mmd`

El diagrama utiliza Mermaid ER Diagram con una representación basada en Crow's Foot y muestra las entidades, atributos, claves primarias, claves foráneas y cardinalidades del modelo.
