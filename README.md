# Smart Grid Viewer (Chrome MV3)

Multi-tab grid viewer that embeds selected sites into a tiled layout with crisp per-iframe scaling. Designed for dashboards, monitoring, and multi-site workflows.

## Features
- Select tabs from the current window and open them in a grid
- Layout presets: auto square-ish, left/right, 2x2
- Per-iframe zoom with high-resolution pre-rendering (no blur)
- Fit modes: `native`, `contain`, `cover` with centering
- Aspect modes: `fill` or `square`
- Drag-and-drop reordering with FLIP animation
- Theme toggle and lightweight overlay controls
- Save/load named grids and last session via `chrome.storage.local`

## Install (Chrome)
- Open `chrome://extensions`
- Enable `Developer mode`
- Click `Load unpacked` and select this folder (`multi-tab-grid-v6`)
- The extension icon opens the popup (`popup.html`)

## Usage
1. Open the popup, select tabs, choose a layout, and click Open Grid
2. The viewer (`grid.html`) renders each site in a cell
3. Use the floating controls:
   - `◑` Toggle theme
   - `↔` Toggle fit (`native → contain → cover`)
   - `□` Toggle aspect (`fill/square`)
   - `＋/－` Zoom per-iframe
4. Drag cells by the small header’s grab handle to reorder
5. Save and load grid profiles in the popup

## Resolution Quality (Important)
- The viewer uses pre-render scaling per iframe instead of page zoom
- Each iframe is rendered at a larger CSS size first, then visually scaled to fit, keeping text sharp across zoom levels and DPI
- Core logic:
  - Native mode renders at `cellSize / zoomScale`, then `transform: scale(zoomScale)`
    - See `grid.js:259–268`
  - Fit modes render at `targetSize / (fitScale × zoomScale)`, then center and `scale(finalScale)`
    - See `grid.js:239–254`
- Overlay/UI are decoupled from zoom; no `document.body.style.zoom`
  - See `grid.js:22–27`

## Storage Keys
- `tabGridConfig` — active grid `{ tabs, layout, _gridName? }`
- `tabGridSavedGrids` — saved profiles list
- `tabGridLastConfig` — last-used grid metadata
- `tabGridFit` — `{ enabled, mode, targetWidth, targetHeight, aspect }`
- `tabGridAspect` — `'fill' | 'square'`
- `tabGridZoom` — numeric zoom factor used by per-iframe scaling

## File Layout
- `manifest.json` — MV3 manifest; permissions: `tabs`, `storage`
- `popup.html` / `popup.js` — tab selection, layout, save/load profiles
- `grid.html` / `grid.js` — tiled viewer and controls
- `styles.css` — shared styling
- `icon.png` — extension icon

## Limitations
- Some sites block embedding in an iframe; the viewer shows a fallback with an “Open in tab” link
- Very small zooms across many iframes can increase GPU work; consider moderate scales or fewer cells for heavy dashboards

## Development
- No build tooling; static `HTML/CSS/JS` only
- Make changes, reload the extension in `chrome://extensions`
- Code references:
  - Grid layout build: `grid.js:35–207`
  - Fit/aspect logic: `grid.js:209–230`, `grid.js:230–270`
  - Zoom handling: `grid.js:376–383`
  - Drag reorder FLIP: `grid.js:272–303`

## Changelog (Latest)
- Removed page-level zoom; added crisp per-iframe pre-render scaling
- Updated fit modes to pre-render before transform scaling
- Decoupled overlays from zoom; cleaner UI at any DPI
- Minor CSS tweak for smoother transforms (`backface-visibility: hidden` on iframes)

