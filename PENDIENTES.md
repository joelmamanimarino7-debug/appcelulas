# Estado del setup — proyecto Firebase `appcelulas-d2889`

Checklist para retomar en otro equipo. Ver `README.md` para instrucciones
detalladas de cada paso.

## Ya hecho ✅

- [x] Proyecto Firebase creado: `appcelulas-d2889`
- [x] App web registrada en Firebase (config copiada)
- [x] Clave de cuenta de servicio generada
- [x] Firestore Database creada (región `southamerica-east1`, modo producción)
- [x] QR de ofrenda simplificado a imagen estática (`public/qr-ofrenda.png`,
      ya no usa Firebase Storage — no hace falta plan Blaze)

## Pendiente en el otro equipo

- [ ] Clonar el repo y correr `npm install`
- [ ] Recrear `.env.local` (no se sube a git por seguridad). Copiar
      `.env.local.example` y completar con:
  - Config web de Firebase (Configuración del proyecto → Tus apps)
  - `FIREBASE_SERVICE_ACCOUNT_JSON`: volver a generar una clave privada en
    Configuración del proyecto → Cuentas de servicio (o copiar la ya
    generada desde un lugar seguro, no por chat/email sin cifrar)
- [ ] Confirmar **Authentication → Sign-in method → Correo/contraseña**
      activado en la consola de Firebase
- [ ] `npx firebase login`
- [ ] `npx firebase use --add` (seleccionar `appcelulas-d2889`)
- [ ] `npx firebase deploy --only firestore:rules,firestore:indexes`
- [ ] Crear el primer administrador:
      `node scripts/seed-admin.mjs correo@ejemplo.com "contraseña" "Nombre"`
      (con `FIREBASE_SERVICE_ACCOUNT_JSON` exportado en el entorno)
- [ ] `npm run dev` y probar login como admin

## Pendiente más adelante (no bloquea el desarrollo)

- [ ] Subir la imagen real del QR de ofrenda a `public/qr-ofrenda.png`
- [ ] Cargar líderes M12 y líderes de célula reales (manual desde
      **Usuarios** en la app, o en bloque con `scripts/import-lideres.mjs`
      + un CSV — ver plantilla en `scripts/lideres-ejemplo.csv`)
- [ ] Decidir dónde desplegar en producción (Vercel recomendado, ver
      README sección 7)
