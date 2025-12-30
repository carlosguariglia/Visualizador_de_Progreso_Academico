# Visualizador de Progreso Académico — "Escalando la Montaña"

Carlos Ignacio Guariglia — 2025

"No se trata de llegar primero, sino de no dejar de subir."

## Resumen

Demo estática que visualiza el progreso académico como un personaje que escala una montaña. Cada materia aporta puntos equivalentes a su carga horaria y un estado (no cursada, cursando, cursada aprobada, final/equivalencia) determina qué fracción de esos puntos cuenta para el progreso total.

## Características Principales

✨ **Selector de Carreras**: Elige entre carreras predefinidas o crea tu propia carrera personalizada.

🎨 **Editor de Carreras Personalizadas**:
- Crea carreras desde cero con nombre personalizado
- Agrega/edita/elimina materias dinámicamente
- Define nombre, año y carga horaria para cada materia
- Duplica carreras existentes como plantilla
- Sistema de ayuda integrado con instrucciones paso a paso

💾 **Almacenamiento Inteligente**:
- Cada carrera mantiene su progreso independiente en localStorage
- Cambia entre carreras sin perder tu progreso
- Importa/exporta carreras en formato JSON

📊 **Visualización Interactiva**:
- Escalador que sube la montaña según tu progreso
- Barra de progreso con porcentaje preciso
- Confetti y bandera de felicitaciones al completar 100%
- Organización por años académicos

📷 **Exportar Imagen del Progreso**:
- Descarga una imagen PNG de alta calidad (600x800px)
- Incluye la montaña con el escalador en su posición actual
- Overlay con nombre de carrera, porcentaje y fecha
- Perfecto para compartir en redes sociales o portafolio
- Sin librerías externas, 100% código nativo

## Stack

- HTML, CSS, JavaScript (vanilla)
- Visual: SVG inline + imágenes en `assets/`
- Persistencia: `localStorage`

## Estructura del proyecto

- `index.html` — Interfaz principal (SVG montaña, contenedores, modal de ayuda, bandera de finalización).
- `styles.css` — Estilos y responsividad.
- `app.js` — Lógica: carga/guardado, cálculo, renderizado, movimiento del escalador, confetti y UI helpers.
- `*.json` — Archivos JSON con materias (puedes importar/exportar desde la UI).
- `assets/` — Imágenes utilizadas:
  - `montana.png` — Imagen de fondo de la montaña
  - `estudiante.png` — Imagen del escalador/estudiante
  - Puedes reemplazar estas imágenes manteniendo los mismos nombres para personalizar la visualización

## Ejecutar localmente

Recomendado: servir por HTTP para que `fetch()` pueda cargar archivos como `materias_extraidas.json`.

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Gestión de Carreras Personalizadas

### Crear una Nueva Carrera

1. Haz clic en el botón **"+ Nueva Carrera"**
2. Ingresa el nombre de tu carrera
3. Haz clic en **"+ Agregar Materia"** para cada materia
4. Completa los datos de cada materia:
   - **Nombre**: Nombre completo de la materia
   - **Año**: Año al que pertenece (1, 2, 3, etc.)
   - **Horas**: Carga horaria total
5. Usa el botón 🗑️ para eliminar materias que no necesites
6. Haz clic en **"Guardar Carrera"** cuando termines

💡 **Tip**: Haz clic en el botón **"?"** dentro del editor para ver instrucciones detalladas.

### Editar una Carrera Existente

1. Selecciona una carrera personalizada del selector
2. Haz clic en el botón **"✏️ Editar"**
3. Modifica el nombre de la carrera o las materias
4. Guarda los cambios

### Duplicar una Carrera

1. Selecciona cualquier carrera (predefinida o personalizada)
2. Haz clic en el botón **"📋 Duplicar"**
3. Se abrirá el editor con todos los datos de la carrera original
4. Modifica lo que necesites y guarda

### Eliminar una Carrera Personalizada

1. Selecciona la carrera personalizada que deseas eliminar
2. Haz clic en el botón **"🗑️ Eliminar"**
3. Confirma la eliminación (esta acción no se puede deshacer)

**Nota**: Las carreras predefinidas (ISFT 151, IDRA) no se pueden eliminar.

## Exportar e Importar

### 📷 Exportar Imagen del Progreso

Genera una imagen PNG profesional de tu progreso académico:

1. Haz clic en el botón **"📷 Exportar Imagen"**
2. La app generará automáticamente una imagen que incluye:
   - La montaña completa con tu escalador en la posición actual
   - Nombre de tu carrera
   - Porcentaje de progreso destacado
   - Fecha de generación
3. El archivo se descargará con nombre descriptivo: `progreso-NombreCarrera-XX%.png`

**Características**:
- Alta calidad (600x800px)
- Formato PNG con fondo blanco
- Sin marcas de agua
- Perfecto para compartir logros académicos

### 💾 Exportar/Importar JSON

**Exportar JSON**:
- Haz clic en "Exportar JSON" para descargar tu progreso
- El formato recomendado es un objeto con metadatos y la lista de materias:

```json
{
  "nombre_carrera": "Tecnicatura Analista de Sistemas - ISFT 151",
  "materias": [
    {"id":"s1","name":"Programación I","hours":80,"state":"final","year":1},
    {"id":"s2","name":"Matemática","hours":60,"state":"cursada","year":1}
  ]
}
```

**Importar JSON**:
- Usa el botón "Importar JSON" para cargar una carrera desde un archivo
- La app también acepta el formato antiguo (array plano de materias) por compatibilidad
- Al exportar, la app guardará un objeto `{ nombre_carrera, materias }` para preservar el título de la carrera

## Elementos de la UI

**Botones principales**:
- **+ Nueva Carrera**: Abre el editor para crear una carrera personalizada desde cero
- **✏️ Editar**: Modifica la carrera personalizada seleccionada
- **📋 Duplicar**: Crea una copia de cualquier carrera (predefinida o personalizada)
- **🗑️ Eliminar**: Elimina la carrera personalizada seleccionada (con confirmación)
- **📷 Exportar Imagen**: Descarga una imagen PNG de tu progreso actual
- **Exportar JSON**: Descarga un archivo JSON con tu progreso
- **Importar JSON**: Carga una carrera desde un archivo JSON
- **Botón "?"**: Abre modales de ayuda con instrucciones detalladas

**Visualización**:
- **Barra de progreso**: Muestra el porcentaje y puntos acumulados
- **Escalador en la montaña**: Se mueve según tu progreso y rota siguiendo la pendiente
- **Bandera / Confetti**: Aparece al alcanzar 100% con animación de celebración
- **Tabs por año**: Organiza las materias por año académico

## Notas técnicas

### Sistema de Almacenamiento
- **Múltiples carreras**: Cada carrera (predefinida o personalizada) guarda su progreso independientemente
- **Claves localStorage**: 
  - `studentProgress_[archivo.json]` para carreras predefinidas
  - `studentProgress_custom_[índice]` para carreras personalizadas
  - `customCareers` array con todas las carreras personalizadas
  - `selectedCareer` última carrera seleccionada

### Funciones principales
- `load(careerFile)` — Carga una carrera específica, primero desde localStorage (progreso guardado), luego desde el archivo JSON (datos base)
- `save()` — Guarda el progreso actual en localStorage usando la clave específica de la carrera
- `calcTotals()` — Calcula puntos totales y actuales usando pesos por estado (no:0, cursando:0.25, cursada:0.75, final/equivalencia:1)
- `moveClimberToPercent(pct)` — Posiciona el escalador sobre el path SVG usando `getTotalLength/getPointAtLength` y calcula rotación según tangente
- `exportProgressImage()` — Clona el SVG, convierte imágenes a base64, agrega overlay con datos, y exporta como PNG
- `renderSubjects()` — Agrupa materias por año y renderiza con selectores para cambiar estado

### Estados de materias y ponderación
```javascript
{
  'no': 0,           // No cursada
  'cursando': 0.25,  // Cursando
  'cursada': 0.75,   // Cursada aprobada
  'final': 1,        // Final aprobado
  'equivalencia': 1  // Equivalencia
}
```

## Changelog reciente

**v2.0 (2025)**:
- ✨ Sistema completo de gestión de carreras personalizadas
- 📷 Exportación de imagen PNG del progreso
- 🎨 Editor de carreras con interfaz intuitiva y ayuda integrada
- 💾 Almacenamiento independiente por carrera
- 📋 Funcionalidad de duplicar carreras como plantilla
- 🎯 Validaciones mejoradas con mensajes descriptivos
- 📱 Diseño responsivo para dispositivos móviles
- ♿ Mejoras de accesibilidad (teclado, ARIA labels)

**v1.0**:
- 🏔️ Visualización inicial con montaña y escalador
- 📊 Barra de progreso y cálculo de porcentajes
- 🎉 Confetti y bandera al completar 100%
- 💾 Importar/exportar JSON
- 📚 Modal de ayuda con instrucciones

## Consejos de ajuste

- Ajustar sprite: en `index.html` dentro de `<g id="climberG">` puedes editar los atributos `x`, `y`, `width`, `height` del `<image>`.
- Afinar colocación: en `app.js` modifica `offsetX` / `offsetY` dentro de `moveClimberToPercent`.
- Si `fetch()` no carga por `file://`, usa el botón Importar (funciona siempre).

## Depuración rápida

- Ver errores en DevTools → Console.
- Si el escalador no aparece, revisa que `assets/estudiante.png` exista y que la referencia en `index.html` sea correcta.
- Si la montaña no se muestra, verifica que `assets/montana.png` esté presente en la carpeta assets.

## Ideas de mejoras

- Validación/Schema al importar JSON.
- Modal custom para confirmaciones en lugar de `confirm()`.
- Implementar confetti en canvas para más realismo.

## Contacto

carlosguariglia@gmail.com


## Licencia

Uso personal/educativo. Si vas a publicar o distribuir, revisá las licencias de las imágenes.
