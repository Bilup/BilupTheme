function convertToIntermediate(themeEntry) {
  const intermediate = {};

  if (themeEntry.colors) {
    intermediate.colors = themeEntry.colors;
    intermediate.wallpaper = themeEntry.wallpaper || null;
    intermediate.fonts = themeEntry.fonts || null;
    intermediate.platformData = themeEntry.platformData || {};
    return { ok: true, intermediate };
  }

  if (themeEntry.accent) {
    return convertOldMistwarpToIntermediate(themeEntry);
  }

  if (themeEntry.isGradient !== undefined || themeEntry.primaryColor) {
    return convertNitroBoltToIntermediate(themeEntry);
  }

  return { ok: false, error: 'unknown theme format' };
}

function convertOldMistwarpToIntermediate(oldFormat) {
  const intermediate = {
    colors: {
      gradient: (oldFormat.accent?.colors || []).map((c, i) => ({
        color: c.color || c,
        position: c.position !== undefined ? c.position : (i / Math.max(1, (oldFormat.accent.colors.length - 1)) * 100)
      })),
      gradientDirection: oldFormat.accent?.direction || 135
    },
    wallpaper: oldFormat.wallpaper || null,
    fonts: oldFormat.fonts || null,
    platformData: {
      mistwarp: {
        gui: oldFormat.gui || '',
        blocks: oldFormat.blocks || '',
        menuBarAlign: oldFormat.menuBarAlign || ''
      }
    }
  };
  return { ok: true, intermediate };
}

function convertNitroBoltToIntermediate(data) {
  const gradientColors = [];
  if (data.isGradient && data.gradient?.colors) {
    data.gradient.colors.forEach((c, i) => {
      gradientColors.push({
        color: c,
        position: (i / Math.max(1, data.gradient.colors.length - 1)) * 100
      });
    });
  } else {
    if (data.primaryColor) gradientColors.push({ color: data.primaryColor, position: 0 });
    if (data.secondaryColor) gradientColors.push({ color: data.secondaryColor, position: 100 });
    if (data.tertiaryColor) gradientColors.push({ color: data.tertiaryColor, position: 50 });
  }

  return {
    ok: true,
    intermediate: {
      colors: {
        gradient: gradientColors,
        gradientDirection: data.gradient?.direction || 135
      },
      wallpaper: null,
      fonts: null,
      platformData: {
        nitrobolt: {
          name: data.name || '',
          isGradient: data.isGradient || false
        }
      }
    }
  };
}

function exportToMistWarp(intermediate, metadata) {
  const gradColors = (intermediate.colors?.gradient || []).map(c => ({ color: c.color, position: c.position }));
  const theme = {
    platform: 'MistWarp',
    themes: [{
      name: metadata.name,
      description: metadata.description,
      accent: { colors: gradColors, direction: intermediate.colors?.gradientDirection || 135 },
      gui: intermediate.platformData?.mistwarp?.gui || 'System',
      blocks: intermediate.platformData?.mistwarp?.blocks || 'System',
      menuBarAlign: intermediate.platformData?.mistwarp?.menuBarAlign || 'Left',
      wallpaper: intermediate.wallpaper || undefined,
      fonts: intermediate.fonts || undefined
    }],
    meta: { generatedBy: 'BilupTheme', generatedAt: new Date().toISOString(), originalUuid: metadata.uuid }
  };
  return { ok: true, theme };
}

function exportToNitroBolt(intermediate, metadata) {
  const gradientColors = (intermediate.colors?.gradient || []).map(c => c.color);
  const theme = {
    isGradient: gradientColors.length > 1,
    name: metadata.name,
    primaryColor: gradientColors[0] || '#4c97ff',
    secondaryColor: gradientColors[1] || '#9966ff',
    tertiaryColor: gradientColors[2] || undefined,
    gradient: { colors: gradientColors, direction: intermediate.colors?.gradientDirection || 135 },
    meta: { generatedBy: 'BilupTheme', generatedAt: new Date().toISOString(), originalUuid: metadata.uuid }
  };
  return { ok: true, theme };
}

function exportToBilup(intermediate, metadata) {
  const theme = {
    name: metadata.name, description: metadata.description,
    colors: intermediate.colors, wallpaper: intermediate.wallpaper,
    fonts: intermediate.fonts, platformData: intermediate.platformData,
    meta: { generatedBy: 'BilupTheme', generatedAt: new Date().toISOString(), originalUuid: metadata.uuid }
  };
  return { ok: true, theme };
}

function exportToPlatform(intermediate, targetPlatform, metadata) {
  if (targetPlatform === 'mistwarp') return exportToMistWarp(intermediate, metadata);
  if (targetPlatform === 'nitrobolt') return exportToNitroBolt(intermediate, metadata);
  if (targetPlatform === 'bilup') return exportToBilup(intermediate, metadata);
  return { ok: false, error: `unsupported platform: ${targetPlatform}` };
}

function isSupportedMod(platform) {
  return ['bilup', 'mistwarp', 'nitrobolt'].includes((platform || '').toLowerCase());
}

function buildExportMetadata(themeData, themeEntry) {
  return {
    uuid: themeData.uuid, version: '2.0',
    timestamp: new Date().toISOString(),
    name: themeData.name || '',
    description: (themeData.description || '').toString(),
    author: (themeData.author || '').toString(),
    createdAt: themeEntry.platformData?.mistwarp?.createdAt || themeEntry.createdAt || ''
  };
}

module.exports = {
  convertToIntermediate, convertOldMistwarpToIntermediate,
  convertNitroBoltToIntermediate, exportToPlatform,
  exportToMistWarp, exportToNitroBolt, exportToBilup,
  isSupportedMod, buildExportMetadata
};
