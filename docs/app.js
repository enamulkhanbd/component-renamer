// Mock initial layer data
const INITIAL_LAYERS = [
  { id: 1, type: 'component', originalName: 'Button / Primary', currentName: 'Button / Primary', originalDesc: 'Main action button', currentDesc: 'Main action button', targetType: 'Components' },
  { id: 2, type: 'component', originalName: 'Button / Secondary', currentName: 'Button / Secondary', originalDesc: 'Secondary action button', currentDesc: 'Secondary action button', targetType: 'Components' },
  { id: 3, type: 'component', originalName: 'Input / Text', currentName: 'Input / Text', originalDesc: 'Standard input field', currentDesc: 'Standard input field', targetType: 'Components' },
  { id: 4, type: 'component', originalName: 'Input / Email', currentName: 'Input / Email', originalDesc: 'Email input field', currentDesc: 'Email input field', targetType: 'Components' },
  { id: 5, type: 'component-set', originalName: 'Card / User Set', currentName: 'Card / User Set', originalDesc: 'User profile card variants', currentDesc: 'User profile card variants', targetType: 'Component Sets' },
  { id: 6, type: 'component', originalName: 'Modal / Confirm', currentName: 'Modal / Confirm', originalDesc: 'Old confirm popup modal', currentDesc: 'Old confirm popup modal', targetType: 'Components' }
];

// Demo CSV data matching layers
const DEMO_DATA = [
  { current_name: 'Button / Primary', new_name: 'Button / Default', description: 'Primary button for standard forms' },
  { current_name: 'Button / Secondary', new_name: 'Button / Outline', description: 'Secondary button for alternative actions' },
  { current_name: 'Input / Text', new_name: 'Input / Field / Text', description: 'Text input container component' },
  { current_name: 'Card / User Set', new_name: 'Card / User Profile Set', description: 'Updated responsive user details' },
  { current_name: 'Nonexistent / Component', new_name: 'Failed / Target', description: 'This matches nothing' }
];

let layers = JSON.parse(JSON.stringify(INITIAL_LAYERS));
let loadedFile = null;
let transactionHistory = [];

// DOM Elements
const mockLayersContainer = document.getElementById('mock-layers-container');
const btnResetCanvas = document.getElementById('btn-reset-canvas');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileNameEl = document.getElementById('file-name');
const fileSizeEl = document.getElementById('file-size');
const btnRemoveFile = document.getElementById('btn-remove-file');
const btnLoadDemo = document.getElementById('btn-load-demo');
const btnExecute = document.getElementById('btn-execute');
const resultsDashboard = document.getElementById('results-dashboard');
const statUpdated = document.getElementById('stat-updated');
const statNotFound = document.getElementById('stat-not-found');
const statDuplicates = document.getElementById('stat-duplicates');
const resultsList = document.getElementById('results-list');
const postRunActions = document.getElementById('post-run-actions');
const btnUndo = document.getElementById('btn-undo');
const btnDownloadReport = document.getElementById('btn-download-report');

// Option Checkboxes
const optRenameComponents = document.getElementById('opt-rename-components');
const optUpdateDescriptions = document.getElementById('opt-update-descriptions');
const optLowercase = document.getElementById('opt-lowercase');
const optHyphenate = document.getElementById('opt-hyphenate');
const optTargetComponents = document.getElementById('opt-target-components');
const optTargetSets = document.getElementById('opt-target-sets');
const optDryRun = document.getElementById('opt-dry-run');

// Initialize
function init() {
  renderLayers();
  setupEventListeners();
}

// Render Figma Mock Canvas Layers
function renderLayers() {
  mockLayersContainer.innerHTML = '';
  layers.forEach(layer => {
    const isSet = layer.type === 'component-set';
    const isChanged = layer.currentName !== layer.originalName || layer.currentDesc !== layer.originalDesc;
    
    const layerEl = document.createElement('div');
    layerEl.className = `mock-layer ${isSet ? 'is-set' : ''} ${isChanged ? 'changed' : ''}`;
    layerEl.innerHTML = `
      <span class="layer-type-tag">${isSet ? 'Component Set' : 'Component'}</span>
      <div class="layer-name-wrap">
        <i class="${isSet ? 'ri-play-list-add-line' : 'ri-instance-line'}"></i>
        <span class="layer-title-text" title="${layer.currentName}">${layer.currentName}</span>
      </div>
      <div class="layer-desc-text" title="${layer.currentDesc}">${layer.currentDesc || 'No description'}</div>
      ${isChanged ? '<span class="layer-status-pill match">Updated</span>' : ''}
    `;
    mockLayersContainer.appendChild(layerEl);
  });
}

function setupEventListeners() {
  // Reset Canvas
  btnResetCanvas.addEventListener('click', () => {
    layers = JSON.parse(JSON.stringify(INITIAL_LAYERS));
    renderLayers();
    addLogEntry('Canvas reset to original state.', 'info');
  });

  // Drag and Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation();
    removeFile();
  });

  // Load Demo Data
  btnLoadDemo.addEventListener('click', () => {
    loadDemoFile();
  });

  // Dry Run toggle affects button text
  optDryRun.addEventListener('change', () => {
    btnExecute.innerHTML = optDryRun.checked ? 
      '<i class="ri-play-fill"></i> Run Dry Run' : 
      '<i class="ri-check-double-line"></i> Apply Renames';
  });

  // Run operation
  btnExecute.addEventListener('click', () => {
    runRenamer();
  });

  // Undo Rename
  btnUndo.addEventListener('click', () => {
    if (transactionHistory.length > 0) {
      layers = JSON.parse(JSON.stringify(transactionHistory));
      renderLayers();
      addLogEntry('Reverted component names and descriptions to previous state.', 'info');
      postRunActions.style.display = 'none';
      statUpdated.textContent = '0';
      statNotFound.textContent = '0';
      statDuplicates.textContent = '0';
    }
  });

  // Download Report Mock
  btnDownloadReport.addEventListener('click', () => {
    alert('Mock Report Downloaded! In Figma, this downloads a detailed CSV summarizing all changes.');
  });

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

function handleFile(file) {
  const isCSV = file.name.endsWith('.csv');
  const isJSON = file.name.endsWith('.json');
  
  if (!isCSV && !isJSON) {
    alert('Please upload a .csv or .json file.');
    return;
  }
  
  loadedFile = {
    name: file.name,
    size: formatBytes(file.size),
    type: isCSV ? 'csv' : 'json'
  };

  showFileDetails();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showFileDetails() {
  fileNameEl.textContent = loadedFile.name;
  fileSizeEl.textContent = loadedFile.size;
  dropZone.style.display = 'none';
  fileInfo.style.display = 'flex';
  btnExecute.disabled = false;
  addLogEntry(`Loaded mapping file: ${loadedFile.name}`, 'info');
}

function removeFile() {
  loadedFile = null;
  fileInput.value = '';
  dropZone.style.display = 'flex';
  fileInfo.style.display = 'none';
  btnExecute.disabled = true;
  resultsDashboard.style.display = 'none';
  addLogEntry('File removed.', 'info');
}

function loadDemoFile() {
  loadedFile = {
    name: 'demo_rename.csv',
    size: '184 Bytes',
    type: 'csv'
  };
  showFileDetails();
}

function addLogEntry(text, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  resultsList.appendChild(entry);
  resultsList.scrollTop = resultsList.scrollHeight;
}

// Rename execution simulator
function runRenamer() {
  if (!loadedFile) return;

  const isDryRun = optDryRun.checked;
  const doRename = optRenameComponents.checked;
  const doDesc = optUpdateDescriptions.checked;
  const doLower = optLowercase.checked;
  const doHyphenate = optHyphenate.checked;
  
  const targetComps = optTargetComponents.checked;
  const targetSets = optTargetSets.checked;

  if (!doRename && !doDesc) {
    alert('Please enable "Rename Components" or "Update Descriptions" in options.');
    return;
  }
  if (!targetComps && !targetSets) {
    alert('Please select at least one Target Type.');
    return;
  }

  // Backup current state for undo
  transactionHistory = JSON.parse(JSON.stringify(layers));

  resultsList.innerHTML = '';
  resultsDashboard.style.display = 'flex';
  addLogEntry(`Starting ${isDryRun ? 'Dry Run' : 'Apply'} Renaming Session...`, 'info');

  let updatedCount = 0;
  let notFoundCount = 0;
  let duplicateCount = 0;

  // Process Demo rules
  DEMO_DATA.forEach(row => {
    // Find matching layer
    const matchingLayer = layers.find(l => l.originalName === row.current_name);

    if (matchingLayer) {
      // Validate Target Type settings
      const typeValid = (matchingLayer.type === 'component' && targetComps) || 
                       (matchingLayer.type === 'component-set' && targetSets);

      if (!typeValid) {
        addLogEntry(`Skipped: "${row.current_name}" type not targeted by filters.`, 'warning');
        return;
      }

      // Perform edits on layer
      let finalName = row.new_name;
      if (doLower) {
        finalName = finalName.toLowerCase();
      }
      if (doHyphenate) {
        finalName = finalName.replace(/\s+/g, '-');
      }

      if (!isDryRun) {
        if (doRename) {
          matchingLayer.currentName = finalName;
        }
        if (doDesc && row.description) {
          matchingLayer.currentDesc = row.description;
        }
      }

      updatedCount++;
      addLogEntry(`Match found: "${row.current_name}" -> "${finalName}"`, 'success');
    } else {
      notFoundCount++;
      addLogEntry(`Warning: Component "${row.current_name}" not found in Figma file.`, 'warning');
    }
  });

  // Calculate duplicates if target CSV itself has overlapping edits
  duplicateCount = 0; // standard csv validator checks

  // Render updates
  if (!isDryRun) {
    renderLayers();
  }

  // Update Stats
  statUpdated.textContent = updatedCount;
  statNotFound.textContent = notFoundCount;
  statDuplicates.textContent = duplicateCount;

  addLogEntry(`Session finished. Matches: ${updatedCount}, Not Found: ${notFoundCount}, Duplicates: ${duplicateCount}`, 'info');

  // Display post-run utilities
  if (!isDryRun) {
    postRunActions.style.display = 'flex';
  } else {
    postRunActions.style.display = 'none';
  }
}

// Start the app
init();
