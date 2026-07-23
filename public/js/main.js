document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const platformSelect = document.getElementById('platform-select');
  const colorSelect = document.getElementById('color-select');
  const themesGrid = document.getElementById('themes-grid');
  const logoutBtn = document.getElementById('logout-btn');
  const userMenuBtn = document.getElementById('user-menu-btn');
  const dropdownMenu = document.getElementById('dropdown-menu');

  setupDropdown();

  sortThemes('newest');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      try {
        const response = await fetch('/logout', {
          method: 'GET'
        });
        if (response.ok) {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const platform = platformSelect ? platformSelect.value : '';
      const color = colorSelect ? colorSelect.value : '';
      filterThemes(query, platform, color);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      sortThemes(this.value);
    });
  }

  if (platformSelect) {
    platformSelect.addEventListener('change', function() {
      const query = searchInput ? searchInput.value.toLowerCase() : '';
      const color = colorSelect ? colorSelect.value : '';
      filterThemes(query, this.value, color);
    });
  }

  if (colorSelect) {
    colorSelect.addEventListener('change', function() {
      const query = searchInput ? searchInput.value.toLowerCase() : '';
      const platform = platformSelect ? platformSelect.value : '';
      filterThemes(query, platform, this.value);
    });
  }

  function filterThemes(query, platform, color) {
    const cards = Array.from(document.querySelectorAll('.theme-card'));

    cards.forEach(card => {
      const name = card.dataset.name.toLowerCase();
      const cardPlatform = (card.dataset.platform || '').toLowerCase();
      const matchesQuery = query === '' || name.includes(query);
      const matchesPlatform = platform === '' || cardPlatform === platform.toLowerCase();
      const matchesColor = color === '' || themeHasColor(card, color);

      if (matchesQuery && matchesPlatform && matchesColor) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

function sortThemes(sortBy) {
  const themesGrid = document.getElementById('themes-grid');
  const cards = Array.from(document.querySelectorAll('.theme-card'));

  const visibleCards = cards.filter(card => card.style.display !== 'none');

  visibleCards.sort((a, b) => {
    switch(sortBy) {
      case 'likes':
        const likesA = parseInt(a.querySelector('.stat span')?.textContent || '0');
        const likesB = parseInt(b.querySelector('.stat span')?.textContent || '0');
        return likesB - likesA;
      case 'name':
        const nameA = a.dataset.name.toLowerCase();
        const nameB = b.dataset.name.toLowerCase();
        return nameA.localeCompare(nameB);
      case 'newest':
      default:
        const dateA = new Date(a.dataset.createdAt || 0).getTime();
        const dateB = new Date(b.dataset.createdAt || 0).getTime();
        return dateB - dateA;
    }
  });

  visibleCards.forEach(card => {
    themesGrid.appendChild(card);
  });
}

function themeHasColor(card, colorName) {
  const header = card.querySelector('.theme-card-header');
  if (!header) return false;

  const colorsData = header.dataset.colors || header.dataset.accent;
  if (!colorsData) return false;

  try {
    const data = JSON.parse(colorsData);
    let gradientColors = null;

    if (data.gradient && Array.isArray(data.gradient)) {
      gradientColors = data.gradient;
    } else if (data.colors && Array.isArray(data.colors)) {
      gradientColors = data.colors;
    }

    if (gradientColors && gradientColors.length > 0) {
      return gradientColors.some(c => {
        const hex = typeof c === 'string' ? c : (c.color || '');
        return hex && colorMatchesCategory(hex, colorName);
      });
    }
  } catch (e) {
    console.debug('Failed to parse gradient data:', e);
  }
  return false;
}

  function colorMatchesCategory(hexColor, category) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return false;

    const hue = rgbToHue(rgb.r, rgb.g, rgb.b);
    const saturation = rgbToSaturation(rgb.r, rgb.g, rgb.b);
    const lightness = rgbToLightness(rgb.r, rgb.g, rgb.b);

    // Skip very dark or very light/unsaturated colors
    if (lightness < 0.15 || lightness > 0.95 || saturation < 0.1) {
      return false;
    }

    switch (category.toLowerCase()) {
      case 'red':
        return (hue >= 345 || hue < 15) && saturation > 0.2;
      case 'orange':
        return hue >= 15 && hue < 45 && saturation > 0.2;
      case 'yellow':
        return hue >= 45 && hue < 65 && saturation > 0.3;
      case 'green':
        return hue >= 65 && hue < 155 && saturation > 0.2;
      case 'blue':
        return hue >= 155 && hue < 260 && saturation > 0.2;
      case 'purple':
        return hue >= 260 && hue < 300 && saturation > 0.2;
      case 'pink':
        return hue >= 300 && hue < 345 && saturation > 0.2;
      default:
        return false;
    }
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHue(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;

    if (max !== min) {
      if (max === r) {
        hue = (g - b) / (max - min) + (g < b ? 6 : 0);
      } else if (max === g) {
        hue = (b - r) / (max - min) + 2;
      } else {
        hue = (r - g) / (max - min) + 4;
      }
      hue *= 60;
    }

    return hue < 0 ? hue + 360 : hue;
  }

  function rgbToSaturation(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    if (max === min) return 0;
    return lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  }

    function rgbToLightness(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return (max + min) / 2;
    }
});

function setupDropdown() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (!userMenuBtn || !dropdownMenu) return;

    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdownMenu.style.display === 'none' || dropdownMenu.style.display === '';
        dropdownMenu.style.display = isHidden ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        dropdownMenu.style.display = 'none';
    });

    dropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdownMenu.style.display = 'none';
        }
    });
}
