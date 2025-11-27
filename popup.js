// popup.js - manage tabs, layouts, and saved grids

document.addEventListener('DOMContentLoaded', () => {
  const tabsContainer = document.getElementById('tabs-container');
  const openGridButton = document.getElementById('open-grid');
  const errorMessage = document.getElementById('error-message');
  const selectAllButton = document.getElementById('select-all');
  const deselectAllButton = document.getElementById('deselect-all');
  const filterInput = document.getElementById('filter-tabs');
  const clearFilterButton = document.getElementById('clear-filter');
  const selectedCountSpan = document.getElementById('selected-count');
  const refreshTabsButton = document.getElementById('refresh-tabs');
  const gridNameInput = document.getElementById('grid-name');
  const saveGridButton = document.getElementById('save-grid');
  const savedGridsContainer = document.getElementById('saved-grids-container');
  const loadLastButton = document.getElementById('load-last');
  const savedSearchInput = document.getElementById('saved-search');
  const clearSavedSearchButton = document.getElementById('clear-saved-search');

  let draggedItem = null;
  let currentSavedGrids = [];
  let lastBadgeId = null;

  function showError(msg) {
    errorMessage.textContent = msg || '';
  }

  function getSelectedLayout() {
    const selected = document.querySelector('input[name="layout"]:checked');
    return selected ? selected.value : 'auto';
  }

  function setSelectedLayout(layout) {
    const radio = document.querySelector(`input[name="layout"][value="${layout}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  function createTabItemFromData(tabData) {
    const item = document.createElement('div');
    item.className = 'tab-item';
    item.draggable = true;

    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    try {
      const fallback = new URL(tabData.url);
      const fallbackIcon = fallback.origin + '/favicon.ico';
      favicon.src = tabData.faviconUrl || fallbackIcon;
    } catch (_) {
      favicon.src = tabData.faviconUrl || '';
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'tab-checkbox';
    checkbox.value = tabData.url;
    checkbox.checked = tabData.enabled !== false;

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = (tabData.title || tabData.url).slice(0, 60);

    const nameInput = document.createElement('input');
    nameInput.className = 'name-input';
    nameInput.placeholder = 'Label';
    nameInput.value = tabData.name || '';

    item.appendChild(favicon);
    item.appendChild(checkbox);
    item.appendChild(label);
    item.appendChild(nameInput);

    // Drag behaviour for reordering
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
      }
      draggedItem = null;
      updateSelectedCount();
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedItem || draggedItem === item) return;

      const bounding = item.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      const midpoint = bounding.height / 2;

      if (offset < midpoint) {
        tabsContainer.insertBefore(draggedItem, item);
      } else {
        tabsContainer.insertBefore(draggedItem, item.nextSibling);
      }
    });

    return item;
  }

  function loadTabsFromConfig(config) {
    tabsContainer.innerHTML = '';
    if (!config || !Array.isArray(config.tabs) || config.tabs.length === 0) {
      return;
    }
    config.tabs.forEach(t => {
      const item = createTabItemFromData(t);
      tabsContainer.appendChild(item);
    });
    if (config.layout) {
      setSelectedLayout(config.layout);
    }
  }

  function loadInitialTabs() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        showError('Error loading tabs: ' + chrome.runtime.lastError.message);
        return;
      }
      if (!tabs || tabs.length === 0) {
        showError('No tabs found in this window.');
        return;
      }
      tabs.forEach(tab => {
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
        const tabData = {
          url: tab.url,
          title: tab.title,
          name: '',
          enabled: true,
          faviconUrl: tab.favIconUrl || ''
        };
        const item = createTabItemFromData(tabData);
        tabsContainer.appendChild(item);
      });
      updateSelectedCount();
    });
  }

  function applyFilter(query) {
    const q = (query || '').toLowerCase();
    const items = tabsContainer.querySelectorAll('.tab-item');
    items.forEach(item => {
      const label = item.querySelector('.tab-label');
      const nameInput = item.querySelector('.name-input');
      const cb = item.querySelector('.tab-checkbox');
      const text = [
        label ? label.textContent : '',
        nameInput ? nameInput.value : '',
        cb ? cb.value : ''
      ].join(' ').toLowerCase();
      item.style.display = q && !text.includes(q) ? 'none' : '';
    });
  }

  function updateSelectedCount() {
    const checkboxes = tabsContainer.querySelectorAll('.tab-checkbox');
    let total = 0;
    let selected = 0;
    checkboxes.forEach(cb => {
      total += 1;
      if (cb.checked) selected += 1;
    });
    if (selectedCountSpan) {
      selectedCountSpan.textContent = `Selected: ${selected}/${total}`;
    }
  }

  function buildConfigFromUI() {
    const items = tabsContainer.querySelectorAll('.tab-item');
    const tabs = [];

    items.forEach(item => {
      const cb = item.querySelector('.tab-checkbox');
      if (!cb) return;
      const label = item.querySelector('.tab-label');
      const nameInput = item.querySelector('.name-input');
      const url = cb.value;
      const title = label ? label.textContent : url;
      const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : title;

      tabs.push({
        url: url,
        title: title,
        name: name,
        enabled: cb.checked
      });
    });

    const enabledTabs = tabs.filter(t => t.enabled);
    if (enabledTabs.length === 0) {
      return null;
    }

    return {
      tabs: enabledTabs,
      layout: getSelectedLayout()
    };
  }

  function renderSavedGridsList(savedGrids, lastId) {
    savedGridsContainer.innerHTML = '';
    currentSavedGrids = savedGrids || [];
    lastBadgeId = lastId || null;

    if (!savedGrids || savedGrids.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'saved-grid-empty';
      empty.textContent = 'No saved grids yet.';
      savedGridsContainer.appendChild(empty);
      return;
    }

    savedGrids
      .sort((a, b) => {
        // Sort by lastUsed desc, then name
        const luA = a.lastUsed || 0;
        const luB = b.lastUsed || 0;
        if (luA !== luB) return luB - luA;
        return a.name.localeCompare(b.name);
      })
      .forEach(grid => {
        const row = document.createElement('div');
        row.className = 'saved-grid-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'saved-grid-name';
        nameSpan.textContent = grid.name;

        if (lastId && grid.id === lastId) {
          const badge = document.createElement('span');
          badge.className = 'saved-grid-badge';
          badge.textContent = 'Last session';
          nameSpan.appendChild(badge);
        }

        const buttonsWrap = document.createElement('div');
        buttonsWrap.className = 'saved-grid-buttons';

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.className = 'tiny-button';
        loadBtn.addEventListener('click', () => {
          // Load this grid into UI and make it active
          gridNameInput.value = grid.name;
          loadTabsFromConfig(grid.config);
          setSelectedLayout(grid.config.layout || 'auto');
          // Save as current config
          const now = Date.now();
          grid.lastUsed = now;
          chrome.storage.local.set({
            tabGridConfig: grid.config,
            tabGridLastConfig: grid.config,
            tabGridSavedGrids: savedGrids
          });
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'tiny-button danger';
        deleteBtn.addEventListener('click', () => {
          const filtered = savedGrids.filter(g => g.id !== grid.id);
          chrome.storage.local.set({ tabGridSavedGrids: filtered }, () => {
            renderSavedGridsList(filtered, null);
          });
        });

        buttonsWrap.appendChild(loadBtn);
        buttonsWrap.appendChild(deleteBtn);

        row.appendChild(nameSpan);
        row.appendChild(buttonsWrap);
        savedGridsContainer.appendChild(row);
      });
  }

  function loadSavedGridsUI() {
    chrome.storage.local.get(['tabGridConfig', 'tabGridSavedGrids', 'tabGridLastConfig'], (data) => {
      if (chrome.runtime.lastError) {
        showError('Error loading saved data: ' + chrome.runtime.lastError.message);
        return;
      }

      const currentConfig = data.tabGridConfig;
      const savedGrids = data.tabGridSavedGrids || [];
      const lastConfig = data.tabGridLastConfig || null;

      if (currentConfig && currentConfig.tabs && currentConfig.tabs.length > 0) {
        loadTabsFromConfig(currentConfig);
        setSelectedLayout(currentConfig.layout || 'auto');
      } else {
        loadInitialTabs();
      }

      const lastId = lastConfig && lastConfig._gridId ? lastConfig._gridId : null;
      renderSavedGridsList(savedGrids, lastId);
      lastBadgeId = lastId;
    });
  }

  // Select / deselect all
  selectAllButton.addEventListener('click', () => {
    const checkboxes = tabsContainer.querySelectorAll('.tab-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    updateSelectedCount();
  });

  deselectAllButton.addEventListener('click', () => {
    const checkboxes = tabsContainer.querySelectorAll('.tab-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectedCount();
  });

  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      applyFilter(e.target.value);
    });
  }

  if (clearFilterButton) {
    clearFilterButton.addEventListener('click', () => {
      filterInput.value = '';
      applyFilter('');
    });
  }

  if (refreshTabsButton) {
    refreshTabsButton.addEventListener('click', () => {
      showError('');
      tabsContainer.innerHTML = '';
      filterInput.value = '';
      applyFilter('');
      loadInitialTabs();
    });
  }

  tabsContainer.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('tab-checkbox')) {
      updateSelectedCount();
    }
  });

  if (savedSearchInput) {
    savedSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = currentSavedGrids.filter(g => g.name.toLowerCase().includes(q));
      renderSavedGridsList(filtered, lastBadgeId);
    });
  }

  if (clearSavedSearchButton) {
    clearSavedSearchButton.addEventListener('click', () => {
      savedSearchInput.value = '';
      renderSavedGridsList(currentSavedGrids, lastBadgeId);
    });
  }

  // Save grid as named profile
  saveGridButton.addEventListener('click', () => {
    showError('');
    const name = gridNameInput.value.trim();
    if (!name) {
      showError('Please enter a grid name before saving.');
      return;
    }

    const config = buildConfigFromUI();
    if (!config) {
      showError('Please select at least one enabled tab to save a grid.');
      return;
    }

    const now = Date.now();
    chrome.storage.local.get(['tabGridSavedGrids'], (data) => {
      const savedGrids = data.tabGridSavedGrids || [];
      let existing = savedGrids.find(g => g.name === name);
      if (existing) {
        existing.config = config;
        existing.updatedAt = now;
        existing.lastUsed = now;
      } else {
        existing = {
          id: 'grid_' + now + '_' + Math.floor(Math.random() * 100000),
          name: name,
          config: config,
          createdAt: now,
          updatedAt: now,
          lastUsed: now
        };
        savedGrids.push(existing);
      }

      chrome.storage.local.set({
        tabGridConfig: config,
        tabGridLastConfig: Object.assign({ _gridId: existing.id }, config),
        tabGridSavedGrids: savedGrids
      }, () => {
        if (chrome.runtime.lastError) {
          showError('Failed to save grid: ' + chrome.runtime.lastError.message);
          return;
        }
        renderSavedGridsList(savedGrids, existing.id);
      });
    });
  });

  // Load last session
  loadLastButton.addEventListener('click', () => {
    showError('');
    chrome.storage.local.get('tabGridLastConfig', (data) => {
      const lastConfig = data.tabGridLastConfig;
      if (!lastConfig || !lastConfig.tabs || lastConfig.tabs.length === 0) {
        showError('No last session found.');
        return;
      }
      loadTabsFromConfig(lastConfig);
      setSelectedLayout(lastConfig.layout || 'auto');
      if (lastConfig._gridName) {
        gridNameInput.value = lastConfig._gridName;
      }
    });
  });

  // Open or update grid view
  openGridButton.addEventListener('click', () => {
    showError('');
    const config = buildConfigFromUI();
    if (!config) {
      showError('Please select at least one enabled tab.');
      return;
    }

    // Remember name if present
    const name = gridNameInput.value.trim();
    if (name) {
      config._gridName = name;
    }

    const now = Date.now();

    chrome.storage.local.get(['tabGridSavedGrids', 'tabGridLastConfig'], (data) => {
      const savedGrids = data.tabGridSavedGrids || [];
      let lastConfig = data.tabGridLastConfig || null;
      let gridId = lastConfig && lastConfig._gridId ? lastConfig._gridId : null;

      // If this config corresponds to a named saved grid, keep linking by name
      if (name) {
        const existing = savedGrids.find(g => g.name === name);
        if (existing) {
          existing.config = config;
          existing.updatedAt = now;
          existing.lastUsed = now;
          gridId = existing.id;
        }
      }

      const lastConfigToStore = Object.assign({}, config, { _gridId: gridId || null, _gridName: name || '' });

      chrome.storage.local.set({
        tabGridConfig: config,
        tabGridLastConfig: lastConfigToStore,
        tabGridSavedGrids: savedGrids
      }, () => {
        if (chrome.runtime.lastError) {
          showError('Failed to save current configuration: ' + chrome.runtime.lastError.message);
          return;
        }

        renderSavedGridsList(savedGrids, gridId);

        const gridUrl = chrome.runtime.getURL('grid.html');
        chrome.tabs.query({ url: gridUrl }, (tabs) => {
          if (tabs && tabs.length > 0) {
            tabs.forEach(t => {
              chrome.tabs.sendMessage(t.id, { type: 'updateGrid', config: config });
            });
            chrome.tabs.update(tabs[0].id, { active: true });
          } else {
            chrome.tabs.create({ url: gridUrl });
          }
        });
      });
    });
  });

  // Initial UI setup
  loadSavedGridsUI();
});
