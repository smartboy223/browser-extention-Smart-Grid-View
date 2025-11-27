# Smart Grid Viewer  
### Multi‑Site Browser Dashboard Extension  
Repository: **https://github.com/smartboy223/browser-extention-Smart-Grid-View**

---

<p align="center">
  <img src="icon.png" width="140" alt="Smart Grid Viewer Icon"/>
</p>

---

## ⭐ Overview
Smart Grid Viewer is a **Chrome & Edge browser extension** that lets you open multiple websites in a **clean, resizable, high‑resolution grid layout**.

Perfect for:
- Security monitoring dashboards  
- Trading dashboards  
- Multi‑site supervision  
- CCTV web UIs  
- Social media multi‑panels  
- Productivity multi‑views  

Built with **crisp pre-render scaling** to avoid the typical blur that happens in Chrome when zooming out pages.

---

## 🚀 Features
### 🔹 Smart Grid Rendering
- High‑resolution iframe rendering (no blur)
- Internal pre-render logic for crisp text & UI
- Full GPU-accelerated transforms
- Works on Chrome & Edge

### 🔹 Layout Controls
- Auto grid
- Two‑column split
- 2×2 grid
- Square mode or fill mode
- Contain / Cover / Native fitting modes

### 🔹 Zoom Controls
- True sharp zoom (not Chrome page zoom)
- Per‑iframe resolution scaling

### 🔹 Tab Management
- Select tabs to include in the grid
- Filter tabs
- Rename tabs (custom labels)
- Drag to reorder
- Save named grid profiles
- Load last session automatically

### 🔹 UX
- Floating tool icons
- Light & dark mode
- Fast grid rebuild
- Smooth drag‑and‑drop

---

## 📦 Installation (Chrome or Edge)

1. Download or clone this repository:  
   **https://github.com/smartboy223/browser-extention-Smart-Grid-View**

2. Open:
   ```
   chrome://extensions/
   ```
   or  
   ```
   edge://extensions/
   ```

3. Enable **Developer Mode** (top-right).

4. Click **Load unpacked**.

5. Select the extension folder.

6. The icon will appear in the toolbar — click it to open the popup.

---

## 🧩 Usage

### 1️⃣ Open the Popup  
Choose the tabs you want, rename labels, and pick a layout.

### 2️⃣ Click **Open / Update Grid**  
This loads the main dashboard (`grid.html`).

### 3️⃣ Use the Floating Controls  
| Button | Function |
|--------|----------|
| ◑ | Toggle theme |
| ↔ | Fit mode: native → contain → cover |
| □ | Aspect mode: fill ↔ square |
| ＋ / － | Grid zoom controls (crisp scaling) |

### 4️⃣ Drag to Reorder  
Use the round handle on the header text.

### 5️⃣ Save Profiles  
Save your multi-tab setup and reload any time.

---

## 🖼 High‑Resolution Rendering (Important)

Chrome normally blurs content when zoomed out.  
This extension uses **pre-render scaling**:

### ✔ Render iframe at *large* internal size  
### ✔ Then scale down visually  
### ✔ Result: Sharp text at any grid size  
### ✔ No loss of quality on 1080p, 2K, or 4K monitors  

Code reference (from `grid.js`):

```js
renderW = cw / scale;
renderH = ch / scale;

iframe.style.width = renderW + 'px';
iframe.style.height = renderH + 'px';
iframe.style.transform = 'scale(' + scale + ')';
```

This ensures every iframe stays sharp even at 20–30% visual size.

---

## 🗂 Project Structure
```
📁 Smart-Grid-View
 ├── grid.html         # Viewer layout
 ├── popup.html        # Tab selection UI
 ├── grid.js           # Core grid engine
 ├── popup.js          # Tab manager & profiles
 ├── styles.css        # Unified styles
 ├── manifest.json     # Chrome MV3 manifest
 └── icon.png          # Extension icon
```

---

## 💾 Storage Keys
- **tabGridConfig** — active grid configuration  
- **tabGridSavedGrids** — list of saved profiles  
- **tabGridLastConfig** — last active grid  
- **tabGridFit** — fit mode & dimensions  
- **tabGridAspect** — aspect mode  
- **tabGridZoom** — zoom level  

---

## ⚠️ Limitations
- Some websites block being embedded in iframes  
- Extreme multi‑grid setups (16–25 windows) use more GPU  
- Browsers may throttle background iframes  

---

## 🛠 Development Notes
- 100% pure HTML/CSS/JS  
- MV3 (Manifest v3) compliant  
- No build steps needed  
- Works offline after installation

### Key Files:
- Grid creation: `grid.js` (lines ~40–200)
- Fit logic: `grid.js` (~210–280)
- Zoom scaling: `grid.js` (~380)
- Drag + reorder: `grid.js` (~300)
- Popup logic: `popup.js` (tab manager)

---

## 📜 Changelog (Latest)
- Added high-resolution pre-render scaling system
- Improved fit modes (contain, cover, native)
- Cleaner toolbar UI
- Faster grid rebuild process
- Enhanced drag-and-drop handling
- Updated README and documentation

---

## ❤️ Author
GitHub: **https://github.com/smartboy223**  
Project: **Smart Grid View Extension**
