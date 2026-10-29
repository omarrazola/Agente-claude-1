# Portal «Diseño con IA · Rumbo» (Edición Antigravity)

Proyecto del portal «Diseño con IA · Rumbo» migrado y adaptado para **Google Antigravity**, desacoplado del entorno de Claude Artifacts e integrado con:
- **Google AI Studio (Gemini 3.8 Flash)** para la orquestación de los 9 agentes de IA y generación estructurada en JSON.
- **Persistencia híbrida (Firebase Firestore / IndexedDB local)**: funciona de forma autónoma sin configuración externa y se conecta a Firebase en tiempo real tan pronto se suministran las credenciales.
- **Jira Cloud REST API**: servidor proxy integrado en Node/Express que elimina las limitaciones de CORS y permite búsqueda JQL, detalle de tickets, comentarios y transiciones de estado.
- **Renderizador de Pantallas & Prototipo interactivo**: visualización fiel en tiempo real con componentes del sistema de diseño Rumbo.

---

## 🚀 Inicio Rápido

### 1. Requisitos
- **Node.js** v18 o superior.
- **API Key de Google AI Studio** (obtenla gratis en [aistudio.google.com](https://aistudio.google.com/)).

### 2. Instalación y Ejecución
Desde esta carpeta:
```bash
# 1. Instalar dependencias (ya instaladas si acabas de clonar)
npm install

# 2. Configurar variables de entorno (opcional, o desde la UI)
cp .env.example .env

# 3. Iniciar el servidor de desarrollo (Backend en puerto 3001 + Frontend en puerto 5173)
npm run dev
```

### 🌐 Cómo acceder:
- **Desde este mismo ordenador:** [http://localhost:5173](http://localhost:5173)
- **Desde cualquier otro ordenador o móvil en la misma Wi-Fi:** `http://<IP_LOCAL>:5173` (Por ejemplo: `http://192.168.0.19:5173`)


---

## ⚙️ Configuración de Credenciales

Puedes configurar tus credenciales de dos formas:

### Opción A: Archivo `.env` (Recomendada para persistencia)
Edita el archivo `.env`:
```env
# Google AI Studio (Obligatorio para que los agentes trabajen)
GEMINI_API_KEY=tu_clave_de_aistudio
GEMINI_MODEL=gemini-3.8-flash

# Jira Cloud (Para sincronizar tareas reales)
JIRA_HOST=pruebascluadegdi.atlassian.net
JIRA_EMAIL=tu_correo@empresa.com
JIRA_API_TOKEN=tu_api_token_de_atlassian

# Firebase Firestore (Opcional - si se deja vacío funciona en modo local con IndexedDB)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
```

### Opción B: Desde los Ajustes del propio Portal
1. Entra al portal y pulsa en la rueda de **Ajustes**.
2. En la sección **Conexión y APIs (Antigravity)** introduce tu clave de Google AI Studio, email y API Token de Jira.
3. Pulsa **Guardar ajustes**.

---

## 📁 Estructura del Proyecto

```text
antigravity-uber-portal/
├── client/                     # Frontend Vite SPA (Vanilla JS + CSS modular)
│   ├── index.html              # Layout principal con selector de rol (Cliente, Diseñador, Orquestador)
│   └── src/
│       ├── main.js             # Lógica de la interfaz, eventos y flujo de pantallas
│       ├── styles/main.css     # Sistema de diseño, temas claro/oscuro y componentes visuales
│       ├── figma/              # Renderer de Figma y tokens del sistema de diseño Rumbo
│       └── services/           # Capa de adaptadores:
│           ├── aiService.js    # Conector a Gemini 3.8 Flash con structured output
│           ├── dbService.js    # Base de datos reactiva (híbrido Firestore / IndexedDB)
│           └── jiraService.js  # Conector a Jira REST API sin CORS
├── server/                     # Backend Node/Express (Gateway & Proxy)
│   ├── index.js                # Servidor Express con endpoints /api/*
│   └── services/
│       ├── geminiClient.js     # Cliente oficial de Google GenAI (@google/genai)
│       └── jiraClient.js       # Cliente HTTP autenticado para Jira Cloud
├── scripts/
│   └── build_app.js            # Script para regenerar el frontend desde el artefacto original
├── package.json
├── vite.config.js
└── .env
```

---

## 🤖 Los 9 Agentes Disponibles en el Portal

1. **Analista de brief**: Evalúa la calidad de la petición del cliente (0-100), sugiere títulos y hace hasta 3 preguntas clave.
2. **Arquitecto UX**: Define objetivos, usuarios, supuestos, flujo paso a paso y decisiones.
3. **UX Writer**: Redacta textos finales, microcopy, botones y tono de voz.
4. **UX Writer (revisión)**: Revisa pantallas existentes y propone mejoras de texto.
5. **UI Designer**: Genera la especificación de pantallas completas con componentes del sistema Rumbo.
6. **QA**: Audita la propuesta frente al brief, detecta inconsistencias y evalúa fidelidad.
7. **Equipo de cambios**: Aplica iteraciones sobre propuestas existentes generando nuevas versiones (v1 -> v2).
8. **Agente de notas**: Redacta notas descriptivas para adjuntar en Figma o Jira.
9. **Resumen de pendientes**: Sintetiza dudas pendientes y puntos a confirmar con el cliente.
