# Minecraft-Style Voxel Terrain Demo

This project generates Minecraft-style 3D cube terrain in the browser using JavaScript and Three.js.
It includes:
- Biome-based terrain generation
- Domain-warped mountain ranges, valleys, cliffs, and plateaus
- River carving and sandy riverbanks
- Caves, ore veins, and biome-specific decorations
- Multiple tree variants (oak/broadleaf, birch, pine/fir, cactus)
- Bushes, flowers, tall grass, and dry shrubs
- Flora rendered as billboard plants (non-cube crossed quads)
- Dynamic sky dome, sun/moon sprites, drifting cloud layer, and tuned lighting
- Seed-based world generation
- Day/night lighting cycle
- Chunk-aware distance fog (hides chunk pop-in at horizon)
- Chunk streaming (new terrain sections load as you move)

## Run

From `/Users/patrickriedinger/Documents/GitHub/53`:

```bash
python3 -m http.server 8000
```

Open:

`http://localhost:8000`

Optional deterministic seed:

`http://localhost:8000/?seed=123456`

## Controls

- Click inside the window: lock mouse
- Mouse: look around
- `W`, `A`, `S`, `D`: move
- `Space` / `Shift`: rise / lower
- `R`: regenerate with a new random seed
- `T`: rebuild using the current seed

## Streaming Notes

- Terrain is generated in `16x16` chunks.
- Chunks are loaded around the camera and unloaded when far away.
- Chunk seams are remeshed when neighbors load/unload so faces stay correct.

## Deploy To Netlify

This repo is configured for Netlify using `/Users/patrickriedinger/Documents/GitHub/53/netlify.toml`.

### Option 1: Netlify UI (Git-connected)

1. Push this folder to GitHub.
2. In Netlify, click **Add new site** -> **Import an existing project**.
3. Select the repo.
4. Build settings:
   - Build command: leave empty
   - Publish directory: `.`
5. Deploy.

### Option 2: Drag and drop

1. Zip the project files (`index.html`, `main.js`, `netlify.toml`).
2. In Netlify, use **Deploy manually** and drop the zip.

### Notes

- Query seeds like `?seed=123456` work normally on Netlify.
- `index.html` is set to revalidate each request.
- `main.js` is cached long-term and your version query string (`main.js?v=...`) handles busting.
