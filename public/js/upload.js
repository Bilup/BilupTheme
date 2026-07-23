document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('theme-file');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadForm = document.getElementById('upload-form');
    const fileNameDisplay = document.getElementById('file-name');
    const themesCountDisplay = document.getElementById('themes-count');
    const themePreviewGrid = document.getElementById('theme-preview-grid');
    const changeFileBtn = document.getElementById('change-file-btn');

    let selectedFile = null;
    let parsedThemes = [];
    let themeQueue = [];
    let availableMods = {};

    async function loadMods() {
        try {
            const response = await fetch('/api/mods');
            const result = await response.json();
            if (result.ok) {
                availableMods = result.mods;
            }
        } catch (error) {
            console.error('Failed to load mods:', error);
        }
    }

    loadMods().then(() => {
        console.log('Available mods loaded:', availableMods);
    });

    uploadArea.addEventListener('click', () => fileInput.click());
    changeFileBtn.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.name.endsWith('.json')) {
            alert('Please select a JSON file');
            return;
        }
        selectedFile = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const themeJson = JSON.parse(e.target.result);
                parseAndPreviewThemes(themeJson, file.name);
            } catch (error) {
                alert('Invalid JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    function parseAndPreviewThemes(themeJson, fileName) {
        parsedThemes = [];
        
if (themeJson.themes && Array.isArray(themeJson.themes)) {
    parsedThemes = themeJson.themes.map((t, index) => ({
      id: index,
      name: t.name || `Theme ${index + 1}`,
      description: t.description || '',
      platform: (themeJson.platform || '').toLowerCase(),
      themeData: t,
      rawJson: themeJson,
      errors: []
    }));
  } else {
    parsedThemes = [{
      id: 0,
      name: themeJson.name || 'Untitled Theme',
      description: themeJson.description || '',
      platform: (themeJson.platform || '').toLowerCase(),
      themeData: themeJson,
      rawJson: themeJson,
      errors: []
    }];
  }

        if (parsedThemes.length === 0) {
            alert('No themes found in file');
            return;
        }

        detectPlatformForThemes(parsedThemes, fileName);
    }

    async function detectPlatformForThemes(themes, fileName) {
        try {
            const response = await fetch('/api/theme/detect-platform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(themes[0].rawJson)
            });

            const result = await response.json();

            if (result.ok && result.platform) {
                themes.forEach(theme => {
                    theme.platform = result.platform;
                });
            }
        } catch (error) {
            console.warn('Platform detection failed:', error);
        }

        fileNameDisplay.textContent = fileName;
        themesCountDisplay.textContent = ` • ${themes.length} theme${themes.length > 1 ? 's' : ''} found`;

        themeQueue = [...themes];
        renderThemePreviews();

        uploadArea.style.display = 'none';
        uploadForm.classList.add('visible');
        uploadBtn.disabled = false;
    }

    function renderThemePreviews() {
        themePreviewGrid.innerHTML = '';

        themeQueue.forEach((theme, index) => {
            const card = document.createElement('div');
            card.className = 'theme-preview-card';
            card.dataset.index = index;

            const gradientStyle = buildGradientStyle(theme.themeData);

            const platformKey = Object.keys(availableMods || {}).find(key => key.toLowerCase() === (theme.platform || '').toLowerCase());
            const modData = platformKey ? availableMods[platformKey] : null;

            const platformBadgeHtml = modData && modData.icon
                ? `<div class="platform-badge">
                    <img src="${escapeHtml(modData.icon)}" alt="${escapeHtml(modData.name)}" class="platform-badge-icon" onerror="this.onerror=null; const span = document.createElement('span'); span.className = 'platform-badge-fallback'; span.textContent = '${escapeHtml(modData.name).charAt(0).toUpperCase()}'; this.parentNode.replaceChild(span, this);">
                    <span>${escapeHtml(modData.name)}</span>
                   </div>`
                : `<div class="platform-badge">
                    <i data-lucide="help-circle" class="platform-badge-icon" style="width: 20px; height: 20px;"></i>
                    <span>${escapeHtml(theme.platform || 'Unknown Platform')}</span>
                   </div>`;

            card.innerHTML = `
                <button type="button" class="remove-btn" data-index="${index}" title="Remove theme">
                    <i data-lucide="x"></i>
                </button>
                <div class="gradient-preview" style="${gradientStyle}"></div>
                ${platformBadgeHtml}
                <div class="theme-info">
                    <div class="form-group">
                        <label>Theme Name *</label>
                        <input type="text" class="theme-name-input" value="${escapeHtml(theme.name)}" placeholder="Enter theme name" data-index="${index}">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="theme-desc-input" placeholder="Describe your theme..." data-index="${index}">${escapeHtml(theme.description)}</textarea>
                    </div>
                    ${theme.errors.length > 0 ? `<div class="validation-error">${escapeHtml(theme.errors.join(', '))}</div>` : ''}
                </div>
            `;

            themePreviewGrid.appendChild(card);
        });

        lucide.createIcons();
        
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                removeTheme(index);
            });
        });
        
        document.querySelectorAll('.theme-name-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                themeQueue[index].name = e.target.value;
            });
        });
        
        document.querySelectorAll('.theme-desc-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                themeQueue[index].description = e.target.value;
            });
        });
    }

    function buildGradientStyle(themeData) {
        let colors = [];
        let direction = themeData.colors?.gradientDirection || 135;
        
        if (themeData.colors && themeData.colors.gradient && Array.isArray(themeData.colors.gradient)) {
            colors = themeData.colors.gradient.map(c => c.color);
        } else if (themeData.colors && themeData.colors.primary && themeData.colors.secondary) {
            colors = [themeData.colors.primary, themeData.colors.secondary];
        }
        
        if (colors.length === 0 && themeData.accent && themeData.accent.colors && Array.isArray(themeData.accent.colors)) {
            colors = themeData.accent.colors.map(c => c.color);
        }
        
        if (colors.length === 0) {
            return `background: linear-gradient(135deg, #4c97ff, #9966ff);`;
        }
        
        if (colors.length === 1) {
            return `background: linear-gradient(${direction}deg, ${colors[0]}, ${colors[0]});`;
        }
        
        const sortedColors = [...colors].sort((a, b) => {
            const posA = themeData.colors?.gradient?.find(c => c.color === a)?.position ?? 0;
            const posB = themeData.colors?.gradient?.find(c => c.color === b)?.position ?? 100;
            return posA - posB;
        });
        
        return `background: linear-gradient(${direction}deg, ${sortedColors.join(', ')});`;
    }

    function removeTheme(index) {
        themeQueue.splice(index, 1);
        
        themeQueue.forEach((theme, i) => {
            theme.id = i;
        });
        
        if (themeQueue.length === 0) {
            uploadForm.classList.remove('visible');
            uploadArea.style.display = 'block';
            selectedFile = null;
            fileInput.value = '';
        } else {
            renderThemePreviews();
            themesCountDisplay.textContent = ` • ${themeQueue.length} theme${themeQueue.length > 1 ? 's' : ''} found`;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    uploadBtn.addEventListener('click', async function() {
        if (themeQueue.length === 0) return;
        
        const themesToUpload = themeQueue.map(theme => ({
            name: theme.name.trim(),
            description: theme.description.trim(),
            themeJson: theme.rawJson,
            platform: theme.platform
        }));
        
        const validationErrors = validateThemes(themesToUpload);
        if (validationErrors.length > 0) {
            alert('Validation errors:\n' + validationErrors.join('\n'));
            return;
        }
        
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        
        try {
            const response = await fetch('/api/theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ themes: themesToUpload })
            });
            
            const result = await response.json();
            
            if (result.ok) {
                const count = result.uuids ? result.uuids.length : 1;
                window.location.href = '/upload-success?count=' + count;
            } else {
                alert('Upload failed: ' + result.error);
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Themes';
            }
        } catch (error) {
            alert('Upload error: ' + error.message);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload Themes';
        }
    });

    function validateThemes(themes) {
        const errors = [];
        
        themes.forEach((theme, index) => {
            if (!theme.name || !theme.name.trim()) {
                errors.push(`Theme ${index + 1}: Name is required`);
            }
            
            if (!theme.platform) {
                errors.push(`Theme ${index + 1}: Platform is required`);
            }
        });
        
        return errors;
    }
});
