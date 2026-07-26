function isSupportedMod(platform) {
  return (platform || '').toLowerCase() === 'bilup';
}

function exportToBilup(themeData) {
  const theme = {
    name: themeData.name,
    description: themeData.description,
    colors: themeData.theme?.colors || themeData.colors || { gradient: [{ color: '#4c97ff', position: 0 }], gradientDirection: 135 },
    wallpaper: themeData.theme?.wallpaper || null,
    fonts: themeData.theme?.fonts || null,
    platformData: themeData.theme?.platformData || {}
  };
  return { ok: true, theme };
}

module.exports = {
  exportToBilup,
  isSupportedMod
};
