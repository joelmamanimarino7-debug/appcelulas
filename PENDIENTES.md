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

- [x] Subir la imagen real del QR de ofrenda a `public/qr-ofrenda.png`
      (recortada para mostrar solo el código, sin datos de pago visibles)
- [x] Cargar líderes M12 y líderes de célula reales: importados 40 M12 +
      166 líderes de célula (206 células) desde el Excel real, vía
      `scripts/import-lideres.mjs`. Login sin correo (usuario@primeraasamblea.app),
      con soporte de líderes en más de una célula y de M12 que además
      lideran su propia célula. Credenciales guardadas en `.secrets/`
      (no se suben a git) — pendiente compartírselas a cada líder.
- [x] Índices compuestos de Firestore creados en consola (celulaId+fecha,
      liderM12Id+fecha) para el panel consolidado y el historial de informes
- [ ] Decidir dónde desplegar en producción (Vercel recomendado, ver
      README sección 7)
- [ ] Compartir credenciales (usuario + contraseña temporal) a cada líder
      de forma segura, y borrar el archivo de `.secrets/` después
