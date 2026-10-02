### **CONSULTAS PRINCIPALES**



#### 1\. Total de pedidos completados



* Acumulado histórico:



&#x09;SELECT COUNT(\*) AS "Total de pedidos completados"

&#x09;FROM ORDERS

&#x09;WHERE order\_status = 'COMPLETED';



* Último mes:



&#x09;SELECT COUNT(\*) AS "Pedidos completados en el último mes"

&#x09;FROM ORDERS

&#x09;WHERE ordered\_at >= date\_trunc('month', NOW() - INTERVAL '1 month')

&#x09;AND ordered\_at < date\_trunc('month', NOW())

&#x20;	AND order\_status = 'COMPLETED';



* Últimos 30 días:



&#x09;SELECT COUNT(\*) AS "Pedidos completados en los últimos 30 días"

&#x09;FROM ORDERS

&#x09;WHERE ordered\_at >= NOW() - INTERVAL '30 days'

&#x20;	AND order\_status = 'COMPLETED';



#### 2\. Total de CO₂ ahorrado



* Ahorro histórico:

&#x09;

&#x09;SELECT SUM(co2\_saved\_kg) AS "Total de CO₂ ahorrado"

&#x09;FROM ORDERS

&#x09;WHERE order\_status = 'COMPLETED';

&#x09;

* Último mes:



&#x09;SELECT SUM(co2\_saved\_kg) AS "CO₂ ahorrado en el último mes"

&#x09;FROM ORDERS

&#x09;WHERE ordered\_at >= date\_trunc('month', NOW() - INTERVAL '1 month')

&#x20;	AND ordered\_at < date\_trunc('month', NOW())

&#x09;AND order\_status = 'COMPLETED';



* Últimos 30 días:



&#x09;SELECT SUM(co2\_saved\_kg) AS "CO₂ ahorrado en los últimos 30 días"

&#x09;FROM ORDERS

&#x09;WHERE ordered\_at >= NOW() - INTERVAL '30 days'

&#x09;AND order\_status = 'COMPLETED';



#### 3\. Ingresos totales



* Acumulado histórico:

&#x09;

&#x09;SELECT SUM(total\_amount) AS "Ingresos totales"

&#x09;FROM ORDERS

&#x09;WHERE order\_status = 'COMPLETED';



* Último mes:



&#x09;SELECT SUM(total\_amount) AS "Ingresos en el último mes"

&#x09;FROM ORDERS

&#x09;WHERE ordered\_at >= date\_trunc('month', NOW() - INTERVAL '1 month')

&#x20;	AND ordered\_at < date\_trunc('month', NOW())

&#x09;AND order\_status = 'COMPLETED';



* Últimos 30 días:



&#x09;SELECT SUM(total\_amount) AS "Ingresos en los últimos 30 días"

&#x09;FROM ORDERS

&#x09;WHERE ordered\_at >= NOW() - INTERVAL '30 days'

&#x09;AND order\_status = 'COMPLETED';

