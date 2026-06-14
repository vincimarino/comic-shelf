# 📚 Mi Colección de Cómics

Web personal para gestionar y visualizar tu colección de cómics con estética de estantería de madera.

## Stack
- **Next.js 16** (App Router, SSR/SSG)
- **LibSQL / SQLite** — base de datos local en `comics.db`
- **Tailwind CSS** — estilos utilitarios
- **Vercel** — despliegue recomendado (gratis)

---

## Arranque rápido

### 1. Instala dependencias
```bash
npm install
```

### 2. Importa tu Excel de Whakoom
```bash
node scripts/import-excel.mjs /ruta/a/BaseDatosComicsWhakoom.xlsx
```

Esto crea/actualiza `comics.db` con todas tus series y cómics.
El script es **idempotente**: puedes ejecutarlo varias veces sin duplicar datos.

### 3. Arranca en desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

### 4. Build de producción
```bash
npm run build
npm start
```

---

## Estructura del proyecto

```
comic-shelf/
├── app/
│   ├── page.tsx                          # Home — estantería completa
│   ├── colecciones/
│   │   ├── page.tsx                      # Vista todas las series
│   │   └── [id]/
│   │       ├── page.tsx                  # Vista interna de una serie
│   │       └── comic/[comicId]/
│   │           └── page.tsx             # Ficha individual de cómic
│   └── search/
│       └── page.tsx                      # Resultados de búsqueda
├── components/
│   ├── Navbar.tsx                        # Barra de navegación
│   ├── ShelfRow.tsx                      # Fila de estantería con tablón
│   ├── BookCover.tsx                     # Portada con fallback
│   └── CollectionsList.tsx              # Vista colecciones (shelf/list)
├── lib/
│   └── data.ts                          # Queries SQLite + tipos
├── scripts/
│   └── import-excel.mjs                 # Importador de Excel Whakoom
├── public/
│   └── covers/                          # Portadas locales (añadir manualmente)
└── comics.db                            # Base de datos SQLite
```

---

## Portadas

Las portadas se obtienen de tres fuentes (por prioridad):

1. **`cover_local`** — archivo en `/public/covers/{wkid}.jpg`
2. **`cover_url`** — URL externa (rellenada por el script de enriquecimiento)
3. **Placeholder** — nombre de la serie en fondo oscuro

### Añadir portadas manualmente
Guarda la imagen como `/public/covers/{wkid}.jpg` donde `wkid` es el ID de Whakoom del cómic.
Luego actualiza la base de datos:
```bash
# Ejemplo: cómic con wkid=120
sqlite3 comics.db "UPDATE comics SET cover_local='120.jpg' WHERE wkid=120"
```

### Script de enriquecimiento (próximamente)
El script `scripts/enrich-whakoom.mjs` scrapeará las URLs de Whakoom para obtener
portadas, autores y sinopsis automáticamente. Pendiente de desarrollo.

---

## Despliegue en Vercel

1. Sube el proyecto a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Variables de entorno: ninguna necesaria para el MVP
4. **Nota**: SQLite en Vercel funciona en modo read-only durante SSR.
   Para producción con datos mutables, considera [Turso](https://turso.tech) (LibSQL en la nube, gratis).

---

## Próximas funcionalidades (v2)
- [ ] Script de enriquecimiento automático desde Whakoom
- [ ] Panel admin para editar fichas
- [ ] Filtros por editorial, idioma
- [ ] Campo "total de tomos" por serie (para % progreso real)
- [ ] Búsqueda con autocompletado
- [ ] Estadísticas de colección
