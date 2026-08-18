# Informes de Célula — Primera Asamblea

App web para llenar y consultar el informe semanal de reunión de célula en
digital, con panel de consolidado para líderes M12 y administración.

## Roles

- **Líder**: llena el informe semanal de su célula y ve su propio historial.
- **Líder M12**: ve el panel consolidado de las células que supervisa.
- **Administrador**: ve todo, crea usuarios y células, y sube el QR de ofrenda.

## 1. Crear el proyecto de Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) y crea un proyecto.
2. **Authentication** → Sign-in method → habilita **Correo/contraseña**.
3. **Firestore Database** → crear base de datos (modo producción).
4. **Storage** → crear bucket (modo producción).
5. **Configuración del proyecto** → en "Tus apps" agrega una app web y copia
   las credenciales (`apiKey`, `authDomain`, etc.).
6. **Configuración del proyecto → Cuentas de servicio** → "Generar nueva
   clave privada" → descarga el JSON. Este se usa solo en el servidor, nunca
   lo subas al repositorio.

## 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Todo el JSON de la cuenta de servicio, en una sola línea:
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## 3. Instalar dependencias y desplegar reglas de seguridad

```bash
npm install
npm install -g firebase-tools   # si no lo tienes
firebase login
firebase use --add              # selecciona tu proyecto
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## 4. Crear el primer administrador

Dentro de la app solo un administrador puede crear otros usuarios, así que
el primero se crea con un script (una sola vez):

```bash
FIREBASE_SERVICE_ACCOUNT_JSON="$(cat ruta/a/tu-service-account.json)" \
  node scripts/seed-admin.mjs tu-correo@iglesia.org "tu-contraseña" "Tu Nombre"
```

## 5. Cargar líderes M12 y líderes de célula

Muchos líderes no tienen correo propio: pueden ingresar con un **usuario**
corto (ej. `carlosrojas`) en vez de un correo — la app lo convierte
internamente en `carlosrojas@primeraasamblea.app`. Quien sí tenga correo
real puede usarlo directamente.

Para cargar varios líderes a la vez (recomendado si son muchos), usa el
script de importación con un CSV. Mira `scripts/lideres-ejemplo.csv` como
plantilla — columnas: `nombre, rol (lider_m12|lider), usuario, email,
telefono, password, numeroCelula, nombreCelula, liderM12` (en `liderM12`
pon el mismo `usuario` o `email` que usaste para ese líder M12).

```bash
FIREBASE_SERVICE_ACCOUNT_JSON="$(cat ruta/a/tu-service-account.json)" \
  node scripts/import-lideres.mjs ruta/a/tus-lideres.csv
```

Si personalizaste `NEXT_PUBLIC_AUTH_EMAIL_SUFFIX` en `.env.local`, expórtalo
también antes de correr el script para que coincida (si no, usa
`primeraasamblea.app` por defecto).

El script crea las cuentas, las células y las vincula. Si dejas la columna
`password` vacía, genera una temporal por persona y las guarda en un
archivo `credenciales-generadas-*.csv` (no se sube al repo — bórralo una
vez que se las compartas a cada líder). Puedes volver a ejecutar el script
las veces que quieras: no duplica cuentas ni células ya creadas, solo
agrega lo nuevo o corrige lo que cambió.

Para uno o dos usuarios sueltos, también puedes crearlos manualmente desde
**Usuarios** dentro de la app (una vez que hayas iniciado sesión como
administrador) y asignar la célula desde **Células**.

## 6. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e ingresa con el
usuario/correo y contraseña del administrador creado en el paso 4.

## 7. Desplegar

Recomendado: [Vercel](https://vercel.com) (conecta el repo, agrega las
mismas variables de entorno del paso 2) o Firebase Hosting con soporte de
Next.js (`firebase deploy --only hosting`, requiere `firebase init hosting`
con "web frameworks" habilitado).

## Estructura de datos (Firestore)

- `usuarios/{uid}`: nombre, email, rol (`lider` | `lider_m12` | `admin`), celulaId, liderM12Id
- `celulas/{id}`: numero, liderId, liderNombre, liderM12Id, liderM12Nombre
- `informes/{id}`: un documento por informe semanal de una célula
- `config/ofrendaQr`: URL de la imagen del QR de ofrenda
