### **DETECCIÓN Y TASA DE ABANDONO DE CARRITOS**

### 

1. #### Consulta para detectar carritos abandonados



* Total de carritos abandonados:

&#x09;

&#x09;SELECT COUNT(\*) AS "Cantidad de carritos abandonados" FROM orders

&#x09;WHERE order\_status = 'PENDING'

&#x09;AND ordered\_at <= NOW() - INTERVAL '1 hour';



* Datos sobre los carritos abandonados:


&#x09;SELECT u.name AS user\_name, r.name AS restaurant\_name, o.distance\_km, p.name AS product\_name

&#x09;FROM orders o

&#x09;JOIN users u ON o.user\_id = u.user\_id

&#x09;JOIN restaurants r ON o.restaurant\_id = r.restaurant\_id

&#x09;JOIN order\_items oi ON o.order\_id = oi.order\_id

&#x09;JOIN products p ON oi.product\_id = p.product\_id



&#x09;WHERE o.order\_status = 'PENDING' 

&#x20;   	AND o.ordered\_at <= NOW() - INTERVAL '1 hour';



#### 2\. Tasa de abandono de carritos



* Cálculo:



&#x09;Tasa de abandono = (Total carritos creados - Total pedidos completados) / Total carritos creados \* 100



* Consulta:

&#x09;

&#x09;WITH volumenes AS (

&#x20;   	SELECT 

&#x20;       (SELECT COUNT(\*) FROM orders) AS carritos\_totales,

&#x20;       (SELECT COUNT(\*) FROM orders WHERE order\_status = 'COMPLETED') AS compras\_completadas)



&#x09;SELECT ROUND((1.0 - (compras\_completadas::numeric / NULLIF(carritos\_totales, 0)::numeric)) \* 100, 2) AS tasa\_abandono\_porcentaje

&#x09;FROM volumenes;

&#x09;

&#x09;




