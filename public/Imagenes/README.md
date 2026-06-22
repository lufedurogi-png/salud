# Imágenes e iconos (UI)

Una sola carpeta: pon aquí todos los PNG, JPG, WebP, etc. que quieras empaquetar con la app.

**Uso típico** (desde una pantalla en `src/screens/`):

```tsx
import { Image } from 'react-native';

const icon = require('../assets/images/home.png');

<Image source={icon} style={{ width: 24, height: 24 }} />
```

La ruta del `require()` debe ser literal (estática) para que Metro la incluya en el bundle.

**No confundir con:** `android/app/src/main/assets/` — recursos nativos (p. ej. el `.obj` del modelo), no iconos de la interfaz.
