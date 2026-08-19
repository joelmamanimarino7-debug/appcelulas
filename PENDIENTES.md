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

- [x] Clonar el repo y correr `npm install`
- [x] Recrear `.env.local` (clave de cuenta de servicio guardada en
      `.secrets/service-account.json`, ignorado por git)
- [x] Confirmar **Authentication → Sign-in method → Correo/contraseña**
      activado en la consola de Firebase
- [x] Reglas de Firestore publicadas (pegadas manualmente en la consola,
      Firestore → Reglas — el CLI `firebase deploy` no tenía permiso para
      chequear las APIs habilitadas con la service account, así que se hizo
      por consola en vez del paso `firebase login` + `firebase deploy`)
- [x] Primer administrador creado con `scripts/seed-admin.mjs`
      (joelmamanimarino7@gmail.com)
- [x] `npm run dev` y login como admin probado — funciona sin errores

## Pendiente más adelante (no bloquea el desarrollo)

- [ ] Subir la imagen real del QR de ofrenda a `public/qr-ofrenda.png`
- [ ] Cargar líderes M12 y líderes de célula reales (manual desde
      **Usuarios** en la app, o en bloque con `scripts/import-lideres.mjs`
      + un CSV — ver plantilla en `scripts/lideres-ejemplo.csv`)
- [ ] Decidir dónde desplegar en producción (Vercel recomendado, ver
      README sección 7)
