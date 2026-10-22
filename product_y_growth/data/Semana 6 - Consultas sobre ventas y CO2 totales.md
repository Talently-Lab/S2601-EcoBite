### **CONSULTAS PARA LA SUMA AGREGADA**



#### 1\. Suma histórica de las ventas



&#x09;SELECT SUM(total\_amount) AS "Suma histórica de ventas"

&#x09;FROM orders

&#x09;WHERE order\_status = 'COMPLETED';



#### 2\. Suma histórica del CO₂ ahorrado

&#x09;

&#x09;SELECT SUM(co2\_saved\_kg) AS "Total de CO₂ ahorrado"

&#x09;FROM orders

&#x09;WHERE order\_status = 'COMPLETED';

&#x09;



