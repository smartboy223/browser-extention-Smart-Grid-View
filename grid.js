// grid.js - render the grid according to saved configuration

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('grid-container');
  const controlsBar = document.getElementById('controls-bar');
  const toolbarName = document.getElementById('toolbar-name');
  const toolbarLayout = document.getElementById('toolbar-layout');
  const refreshAllBtn = document.getElementById('refresh-all');
  const toggleThemeBtn = document.getElementById('toggle-theme');
  const fitWidthBtn = document.getElementById('fit-width');
  const aspectModeBtn = document.getElementById('aspect-mode');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  let currentConfig = null;
  let dragIndex = null;
  let fitState = { enabled: false, mode: 'native', targetWidth: 1366, targetHeight: 768, aspect: 'fill' };
  let layoutCols = 0;
  let layoutRows = 0;
  let baseDPR = window.devicePixelRatio || 1;
  let zoomScale = 1;

  function updateOverlayScales() {
    const dpr = window.devicePixelRatio || 1;
    const relative = baseDPR / dpr;
    document.body.style.setProperty('--header-scale', String(relative));
    if (controlsBar) controlsBar.style.zoom = '';
  }

  function clearGrid() {
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }
  }

  function applyLayout(config) {
    clearGrid();

    if (!config || !config.tabs || config.tabs.length === 0) {
      return;
    }

    currentConfig = config;

    const tabs = config.tabs;
    const layout = config.layout || 'auto';
    const n = tabs.length;

    let cols, rows;

    if (layout === 'twoColumns') {
      cols = 2;
      rows = Math.ceil(n / cols);
    } else if (layout === 'fourGrid') {
      cols = 2;
      rows = Math.ceil(n / cols);
    } else {
      // auto grid: roughly square for stable rows/columns
      cols = Math.ceil(Math.sqrt(n));
      rows = Math.ceil(n / cols);
    }

    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    layoutCols = cols;
    layoutRows = rows;

    if (toolbarName) toolbarName.textContent = config._gridName ? `Grid: ${config._gridName}` : 'Grid';
    if (toolbarLayout) {
      const layoutText = layout === 'twoColumns' ? 'Layout: Left/Right' : (layout === 'fourGrid' ? 'Layout: 2x2' : 'Layout: Auto');
      toolbarLayout.textContent = layoutText;
    }

    tabs.forEach((tab, index) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.draggable = true;
      cell.dataset.index = String(index);

      const header = document.createElement('div');
      header.className = 'small-header';
      const headerText = document.createElement('span');
      headerText.className = 'header-text';
      headerText.textContent = tab.name || tab.title || tab.url;
      const grab = document.createElement('span');
      grab.className = 'grab-handle';
      grab.setAttribute('title', 'Drag');
      grab.draggable = true;
      header.appendChild(headerText);
      header.appendChild(grab);

      const iframe = document.createElement('iframe');
      iframe.src = tab.url;
      iframe.className = 'grid-iframe';
      iframe.setAttribute('loading', 'lazy');

      const controls = document.createElement('div');
      controls.className = 'grid-cell-controls';
      const openBtn = document.createElement('button');
      openBtn.className = 'tiny-button';
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: tab.url });
      });
      const reloadBtn = document.createElement('button');
      reloadBtn.className = 'tiny-button';
      reloadBtn.textContent = 'Reload';
      reloadBtn.addEventListener('click', () => {
        iframe.src = iframe.src;
      });
      controls.appendChild(openBtn);
      controls.appendChild(reloadBtn);

      cell.appendChild(header);
      cell.appendChild(controls);
      cell.appendChild(iframe);
      grid.appendChild(cell);

      let loaded = false;
      iframe.addEventListener('load', () => {
        loaded = true;
      });
      setTimeout(() => {
        if (!loaded) {
          const blocked = document.createElement('div');
          blocked.className = 'grid-blocked';
          const msg = document.createElement('span');
          msg.textContent = 'This site may block embedding.';
          const link = document.createElement('a');
          link.href = tab.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Open in tab';
          blocked.appendChild(msg);
          blocked.appendChild(link);
          cell.appendChild(blocked);
        }
      }, 8000);
      function setDragImageFromCell(e) {
        try {
          if (!e.dataTransfer) return;
          const clone = cell.cloneNode(true);
          clone.style.width = `${cell.clientWidth}px`;
          clone.style.height = `${cell.clientHeight}px`;
          clone.style.position = 'fixed';
          clone.style.left = '-9999px';
          clone.style.top = '-9999px';
          clone.style.opacity = '0.95';
          clone.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
          document.body.appendChild(clone);
          e.dataTransfer.setDragImage(clone, clone.clientWidth / 2, clone.clientHeight / 2);
          setTimeout(() => {
            document.body.removeChild(clone);
          }, 0);
        } catch (_) {}
      }

      grab.addEventListener('dragstart', (e) => {
        dragIndex = Number(cell.dataset.index);
        cell.classList.add('dragging');
        document.body.classList.add('drag-mode');
        setDragImageFromCell(e);
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', '');
        }
      });
      cell.addEventListener('dragstart', (e) => {
        dragIndex = Number(cell.dataset.index);
        cell.classList.add('dragging');
        document.body.classList.add('drag-mode');
        try {
          if (e && e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            setDragImageFromCell(e);
          }
        } catch (_) {}
      });

      cell.addEventListener('dragend', () => {
        cell.classList.remove('dragging');
        document.body.classList.remove('drag-mode');
      });

      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.classList.add('drag-over');
        const targetIndex = Number(cell.dataset.index);
        if (dragIndex === null || dragIndex === targetIndex) return;
        reorderCellsFLIP(dragIndex, targetIndex);
        dragIndex = targetIndex;
      });

      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drag-over');
      });

      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        document.body.classList.remove('drag-mode');
        dragIndex = null;
      });
    });
    applyAspectMode();
    applyFitToIframes();
  }

  function applyAspectMode() {
    if (!layoutCols || !layoutRows) return;
    if (fitState.aspect === 'square') {
      const rect = grid.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      const cellSize = Math.floor(Math.min(cw / layoutCols, ch / layoutRows));
      grid.style.gridTemplateColumns = `repeat(${layoutCols}, ${cellSize}px)`;
      grid.style.gridTemplateRows = `repeat(${layoutRows}, ${cellSize}px)`;
      grid.style.justifyContent = 'center';
      grid.style.alignContent = 'center';
    } else {
      grid.style.gridTemplateColumns = `repeat(${layoutCols}, minmax(0, 1fr))`;
      grid.style.gridTemplateRows = `repeat(${layoutRows}, 1fr)`;
      grid.style.justifyContent = '';
      grid.style.alignContent = '';
    }
  }

  function reflowResponsiveLayout() {}

  function applyFitToIframes() {
    const cells = Array.from(grid.querySelectorAll('.grid-cell'));
    cells.forEach((cell) => {
      const iframe = cell.querySelector('iframe');
      if (!iframe) return;
      const cw = cell.clientWidth;
      const ch = cell.clientHeight;
      if (fitState.enabled && fitState.mode !== 'native') {
        const sw = cw / fitState.targetWidth;
        const sh = ch / fitState.targetHeight;
        let scaleFit;
        if (fitState.mode === 'contain') {
          scaleFit = Math.min(sw, sh);
        } else {
          scaleFit = Math.max(sw, sh);
        }
        const finalScale = scaleFit * zoomScale;
        const renderW = fitState.targetWidth / finalScale;
        const renderH = fitState.targetHeight / finalScale;
        const contentW = fitState.targetWidth * finalScale;
        const contentH = fitState.targetHeight * finalScale;
        const offsetX = Math.round((cw - contentW) / 2);
        const offsetY = Math.round((ch - contentH) / 2);
        iframe.style.transformOrigin = 'top left';
        iframe.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${finalScale})`;
        iframe.style.width = `${renderW}px`;
        iframe.style.height = `${renderH}px`;
      } else {
        const finalScale = zoomScale;
        const renderW = cw / finalScale;
        const renderH = ch / finalScale;
        iframe.style.transformOrigin = 'top left';
        iframe.style.transform = `scale(${finalScale})`;
        iframe.style.width = `${renderW}px`;
        iframe.style.height = `${renderH}px`;
      }
    });
  }

  function reorderCellsFLIP(fromIndex, toIndex) {
    const cells = Array.from(grid.children);
    const initialRects = cells.map(el => el.getBoundingClientRect());

    const node = cells[fromIndex];
    const reference = fromIndex < toIndex ? cells[toIndex].nextSibling : cells[toIndex];
    grid.insertBefore(node, reference);

    if (currentConfig) {
      const moved = currentConfig.tabs.splice(fromIndex, 1)[0];
      currentConfig.tabs.splice(toIndex, 0, moved);
      chrome.storage.local.set({ tabGridConfig: currentConfig }, () => {});
    }

    const finalRects = Array.from(grid.children).map(el => el.getBoundingClientRect());
    Array.from(grid.children).forEach((el, i) => {
      const dx = initialRects[i].left - finalRects[i].left;
      const dy = initialRects[i].top - finalRects[i].top;
      if (dx || dy) {
        el.style.transition = 'transform 150ms ease';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          el.style.transform = '';
        });
        el.addEventListener('transitionend', () => {
          el.style.transition = '';
        }, { once: true });
      }
      el.dataset.index = String(i);
      el.classList.remove('drag-over');
    });
  }

  // Initial load from storage
  chrome.storage.local.get('tabGridConfig', (data) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading grid configuration:', chrome.runtime.lastError.message);
      return;
    }
    chrome.storage.local.get(['tabGridFit','tabGridAspect','tabGridZoom'], (fit) => {
      const fs = fit.tabGridFit;
      if (fs && typeof fs === 'object') {
        fitState.targetWidth = fs.targetWidth || fitState.targetWidth;
        fitState.targetHeight = fs.targetHeight || fitState.targetHeight;
      }
      const aspect = fit.tabGridAspect;
      if (aspect === 'square' || aspect === 'fill') {
        fitState.aspect = aspect;
      }
      fitState.enabled = false;
      fitState.mode = 'native';
      const zoomState = typeof fit.tabGridZoom === 'number' ? fit.tabGridZoom : 1;
      zoomScale = zoomState;
      updateOverlayScales();
      chrome.storage.local.set({ tabGridFit: fitState, tabGridZoom: zoomState }, () => {});
      applyLayout(data.tabGridConfig);
    });
  });

  // Listen for updates from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'updateGrid') {
      applyLayout(message.config);
      if (sendResponse) sendResponse({ status: 'ok' });
    }
  });

  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', () => {
      const iframes = grid.querySelectorAll('iframe');
      iframes.forEach(f => {
        f.src = f.src;
      });
    });
  }

  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
    });
  }
  if (fitWidthBtn) {
    const modes = ['native', 'contain', 'cover'];
    fitWidthBtn.addEventListener('click', () => {
      const idx = modes.indexOf(fitState.mode || 'cover');
      const next = modes[(idx + 1) % modes.length];
      fitState.enabled = next !== 'native';
      fitState.mode = next;
      fitWidthBtn.title = `Fit: ${next}`;
      chrome.storage.local.set({ tabGridFit: fitState }, () => {});
      applyFitToIframes();
    });
    fitWidthBtn.title = `Fit: ${fitState.mode}`;
  }
  if (aspectModeBtn) {
    aspectModeBtn.addEventListener('click', () => {
      fitState.aspect = fitState.aspect === 'fill' ? 'square' : 'fill';
      aspectModeBtn.title = `Aspect: ${fitState.aspect}`;
      chrome.storage.local.set({ tabGridAspect: fitState.aspect }, () => {});
      applyAspectMode();
      applyFitToIframes();
    });
    aspectModeBtn.title = `Aspect: ${fitState.aspect}`;
  }
  function setZoom(next) {
    const v = Math.max(0.33, Math.min(2, next));
    zoomScale = v;
    chrome.storage.local.set({ tabGridZoom: v }, () => {});
    updateOverlayScales();
    applyAspectMode();
    applyFitToIframes();
  }
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const current = zoomScale || 1;
      const step = current >= 1 ? 0.15 : 0.1;
      setZoom(current + step);
      zoomInBtn.title = `Zoom In (${Math.round((zoomScale||1) * 100)}%)`;
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const current = zoomScale || 1;
      const step = current > 1 ? 0.15 : 0.1;
      setZoom(current - step);
      zoomOutBtn.title = `Zoom Out (${Math.round((zoomScale||1) * 100)}%)`;
    });
  }
  window.addEventListener('resize', () => {
    reflowResponsiveLayout();
    applyAspectMode();
    applyFitToIframes();
    updateOverlayScales();
  });
  try {
    const ro = new ResizeObserver(() => {
      applyAspectMode();
      applyFitToIframes();
      updateOverlayScales();
    });
    ro.observe(grid);
  } catch (_) {}

  let idleTimer = null;
  const IDLE_MS = 20000;
  function showControlsAndScheduleHide() {
    if (idleTimer) clearTimeout(idleTimer);
    document.body.classList.remove('controls-hidden');
    idleTimer = setTimeout(() => {
      document.body.classList.add('controls-hidden');
    }, IDLE_MS);
  }
  ['mousemove', 'touchstart', 'keydown', 'wheel'].forEach(ev => {
    window.addEventListener(ev, showControlsAndScheduleHide, { passive: true });
  });
  showControlsAndScheduleHide();
  [toggleThemeBtn, fitWidthBtn, aspectModeBtn, zoomInBtn, zoomOutBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', showControlsAndScheduleHide);
  });
});
