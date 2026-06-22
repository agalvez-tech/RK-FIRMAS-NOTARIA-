# 📋 Firmas Notaría · RK Palanca Fontestad

Calendario de seguimiento de firmas de notaría para el Dpto. de Firmas y Postventa.

- **Modo consulta** — todo el equipo puede ver el calendario (sin login)
- **Modo edición** — solo Mireia y Vicky, protegido por PIN

---

## 🚀 Despliegue en Vercel (paso a paso)

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "rk-firmas-notaria inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/rk-firmas-notaria.git
git push -u origin main
```

### 2. Crear proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New → Project**
2. Importa el repositorio `rk-firmas-notaria`
3. Vercel detecta Vite automáticamente — no cambies nada
4. Pulsa **Deploy**

### 3. Conectar Vercel KV (base de datos en tiempo real)

Desde el dashboard de Vercel de este proyecto:

1. **Storage → Create Database → KV (Upstash)**
2. Nombre: `rk-firmas-kv`
3. Región: `fra1` (Frankfurt, la más cercana)
4. **Connect to project** — Vercel añade automáticamente las variables de entorno `KV_REST_API_URL` y `KV_REST_API_TOKEN`

### 4. Configurar el PIN de edición

En Vercel → Settings → Environment Variables, añade:

```
RK_FIRMAS_PIN = (el PIN que elijas, mínimo 4 dígitos)
```

> Recomendación: usa un PIN que Mireia y Vicky recuerden fácilmente pero que el resto del equipo no conozca. Por ejemplo: el año de fundación + dos dígitos (no lo pongas aquí en texto).

Luego haz **Redeploy** para que la variable surta efecto.

---

## 🔗 Añadir a BASE

En el repositorio de BASE (`base-rk-palanca-fontestad`), edita `src/data.js` y añade esta entrada en la categoría `'Proceso de firma y postventa'`:

```js
{
  cat: 'Proceso de firma y postventa',
  tipo: 'APP',
  nombre: 'Calendario de firmas',
  url: 'https://rk-firmas-notaria.vercel.app',
  desc: 'Seguimiento en tiempo real de las firmas de notaría. Edición exclusiva Mireia y Vicky.',
},
```

> Cambia `rk-firmas-notaria.vercel.app` por la URL real que te dé Vercel al desplegar.

---

## 📁 Estructura del proyecto

```
├── index.html
├── vite.config.js
├── package.json
├── api/
│   └── firmas.js          ← Serverless function (lectura/escritura en KV)
└── src/
    ├── main.jsx
    ├── App.jsx             ← Toda la app (calendario + modales + lógica)
    └── index.css           ← Variables de marca RK
```

## 🔐 Cómo funciona el control de acceso

| Acción | Quién puede |
|--------|------------|
| Ver el calendario | Todo el equipo (sin PIN) |
| Ver detalle de una firma | Todo el equipo (sin PIN) |
| Añadir una firma | Solo con PIN (Mireia / Vicky) |
| Eliminar una firma | Solo con PIN (Mireia / Vicky) |

El PIN se valida **siempre en el servidor** (función serverless en `/api/firmas.js`). El cliente no tiene acceso al PIN real — envía lo que escribe el usuario y el servidor acepta o rechaza.

Una vez introducido correctamente en sesión, no hace falta volver a pedirlo hasta cerrar el navegador.

---

## 🔄 Sincronización en tiempo real

La app hace polling automático cada **30 segundos** para refrescar los datos. También hay un botón de actualización manual (↻) en la barra naranja. El equipo verá siempre los datos actualizados sin necesidad de recargar la página.

---

RK Palanca Fontestad · Desde 1976 · L'Horta Nord, Valencia
