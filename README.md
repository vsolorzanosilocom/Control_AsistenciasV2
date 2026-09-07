# Silocom - Sistema de Control de Asistencias

Sistema corporativo de registro de asistencias y control de jornadas laborales con geofencing satelital y sincronización en tiempo real con Google Sheets para **Silocom C.A.** (RIF: J-30725192-1).

Desarrollado bajo el sistema de diseño **Obsidian Pulse Enterprise** (`DESIGN.md`), con arquitectura optimizada para despliegue directo en **Vercel** y repositorio **GitHub**.

---

## 🚀 Características Principales

- **Geofencing Satelital de Alta Precisión**:
  - Epicentro de Sede Silocom: `Lat: 10.494505`, `Lng: -66.831454`
  - Perímetro de seguridad: Radio máximo de **60 metros** (`0.06 km`).
  - Cálculo geodésico exacto mediante la **Fórmula de Haversine** idéntica a `Codigo.gs`.
  - Interruptor de prueba *"Probar en Sede"* para simulaciones en entornos de testing.

- **Marcaje de Jornada (Entrada & Salida)**:
  - Botón primario **🟢 ENTRADA** (Iniciar Jornada) con destello esmeralda `#10b981`.
  - Botón secundario **🔵 SALIDA** (Finalizar Jornada) con destello azul dodger `#0284c7`.
  - Animación de validación biométrica/radar (`#38bdf8`) durante el marcaje.
  - Horarios oficiales: Entrada 08:00, Salida 17:00, Tolerancia 30 min, Cierre automático a las 17:30 (hora oficial 17:00:00).

- **Seguridad de Terminal y Huella Digital de Dispositivo (`idDispositivo`)**:
  - Detección y vinculación de terminal móvil en el primer marcaje (`DEV-XXXXXX`).
  - Detección y bloqueo de intentos de suplantación desde equipos no autorizados.
  - Opción administrativa de restablecimiento de dispositivo por cambio de equipo.

- **Sincronización en Tiempo Real con Google Sheets**:
  - Compatible con el Webhook de Google Apps Script (`doPost` / `doGet`).
  - Respaldo local inmediato garantizado contra fallas de red.
  - Pre-cargado con el histórico de registros provisto en el Google Sheet de Silocom.

- **Panel de Administración & Auditoría**:
  - Acceso seguro mediante verificación de ID de Administrador (`vsolorzano.silocom@gmail.com`).
  - **Resumen de Asistencias**: Tabla completa con filtros por mes, empleado, tipo de marcaje y exportación a CSV.
  - **Días Asistidos & Métricas**: Cuadro `DIAS_ASISTIDOS` (días asistidos, días laborables, días faltantes y porcentaje de asistencia).
  - **Cierre X Sistema**: Ejecución manual/automática de cierre para empleados con turnos abiertos.
  - **Configurador de Variables**: Prueba de conectividad en vivo con la Web App de Apps Script.

---

## 🛠️ Variables de Entorno (Vercel & Local)

Copia `.env.example` a `.env` o configúralas en la sección **Environment Variables** de tu proyecto en Vercel:

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `VITE_GOOGLE_APPS_SCRIPT_URL` | URL de la Web App desplegada en Google Apps Script | *(Pegar URL terminada en `/exec`)* |
| `VITE_GOOGLE_SHEET_ID` | ID de la hoja de Google Sheets en Google Drive | *(ID extraído de la URL del Sheet)* |
| `VITE_ADMIN_EMAIL` | Correo del Administrador principal de Silocom | `vsolorzano.silocom@gmail.com` |
| `VITE_OFFICE_LAT` | Latitud de la oficina de Silocom | `10.494505` |
| `VITE_OFFICE_LNG` | Longitud de la oficina de Silocom | `-66.831454` |
| `VITE_OFFICE_RADIUS_METERS` | Radio de tolerancia de geofencing en metros | `60` |

---

## 📋 Configuración de Google Sheets (Apps Script)

1. Abre tu Google Sheets en Google Drive.
2. Asegúrate de tener las hojas llamadas:
   - `Asistencias` (Columnas: ID/Usuario, Nombre, Tipo, Fecha y Hora, Ubicación, Estado).
   - `Configuracion` (Celda D2: Correo del Administrador, E4:E11: Horarios, G:K: Días Asistidos, Fila 7: Lista de empleados).
3. Ve a **Extensiones** > **Apps Script**.
4. Pega el contenido del archivo `google-apps-script/Codigo.gs` incluido en este repositorio.
5. Haz clic en **Implementar** > **Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo** (tu cuenta de Google)
   - Quién tiene acceso: **Cualquier persona** (*Anyone*)
6. Copia la URL de la aplicación web resultante (terminada en `/exec`).
7. Pega esa URL en `VITE_GOOGLE_APPS_SCRIPT_URL` en tu proyecto de Vercel.

---

## 📦 Despliegue en Vercel

1. Sube tu proyecto a un repositorio en **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Silocom Control de Asistencias"
   git remote add origin https://github.com/tu-usuario/silocom-asistencias.git
   git push -u origin main
   ```
2. Inicia sesión en [Vercel](https://vercel.com) e importa tu repositorio de GitHub.
3. Vercel detectará automáticamente **Vite**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. En **Environment Variables**, agrega las variables indicadas arriba.
5. Haz clic en **Deploy**. ¡Tu aplicación estará en línea con HTTPS y soporte móvil completo!
