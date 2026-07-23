document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    let uuid = urlParams.get('uuid');

    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const themeUuid = deleteBtn.dataset.uuid || uuid;
            if (!themeUuid) {
                alert('Theme UUID not found');
                return;
            }
            if (confirm('Are you sure you want to delete this theme?')) {
                try {
                    const response = await fetch(`/api/theme?uuid=${themeUuid}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();

                    if (result.ok) {
                        window.location.href = '/';
                    } else {
                        alert('Failed to delete theme: ' + result.error);
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('An error occurred. Please try again.');
                }
            }
        });
    }
    
    const ratingBtns = document.querySelectorAll('.rating-btn:not(.disabled)');
    ratingBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const rating = this.dataset.rating;
            const exportOption = document.querySelector('.export-option');
            const themeUuid = exportOption ? exportOption.dataset.themeUuid : uuid;

            if (!themeUuid) {
                alert('Theme UUID not found');
                return;
            }

            try {
                const response = await fetch('/api/rate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `uuid=${themeUuid}&rating=${rating}`
                });

                const result = await response.json();

                if (result.ok) {
                    const wasActive = this.classList.contains('active');
                    const oldRating = document.querySelector('.rating-btn.active');
                    if (oldRating) {
                        oldRating.classList.remove('active');
                    }
                    if (!wasActive) {
                        this.classList.add('active');
                    }

                    const likesBtn = document.querySelector('.rating-btn.like span');
                    const dislikesBtn = document.querySelector('.rating-btn.dislike span');

                    if (likesBtn) {
                        likesBtn.textContent = formatNumber(result.likes || 0);
                    }
                    if (dislikesBtn) {
                        dislikesBtn.textContent = formatNumber(result.dislikes || 0);
                    }
                } else {
                    if (result.error && result.error.includes('must be logged in')) {
                        if (confirm('You need to log in to like/dislike themes. Redirect to login page?')) {
                            window.location.href = '/auth';
                        }
                    } else {
                        alert('Failed to rate theme: ' + (result.error || 'unknown error'));
                    }
                }
            } catch (error) {
                console.error('Rating error:', error);
                alert('An error occurred. Please try again.');
            }
        });
    });
    
    // Export dropdown functionality
    const exportDropdownBtn = document.getElementById('export-dropdown-btn');
    const exportDropdownMenu = document.getElementById('export-dropdown-menu');
    
    if (exportDropdownBtn && exportDropdownMenu) {
        exportDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            exportDropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!exportDropdownBtn.contains(e.target) && !exportDropdownMenu.contains(e.target)) {
                exportDropdownMenu.classList.remove('show');
            }
        });
        
        // Handle export option clicks
        const exportOptions = document.querySelectorAll('.export-option');
        exportOptions.forEach(option => {
            option.addEventListener('click', async function() {
                const platform = this.dataset.platform;
                const themeUuid = this.dataset.themeUuid;

                if (!themeUuid) {
                    alert('Theme UUID not found');
                    return;
                }

                console.log('Export button clicked:', { platform, themeUuid });

                exportDropdownMenu.classList.remove('show');

                try {
                    const response = await fetch(`/api/theme/export?uuid=${encodeURIComponent(themeUuid)}&platform=${platform}`);

                    if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `theme-${themeUuid}-${platform}.json`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    } else {
                        const result = await response.json();
                        console.error('Export failed:', result);
                        alert('Failed to export theme: ' + result.error);
                    }
                } catch (error) {
                    console.error('Export error:', error);
                    alert('An error occurred. Please try again.');
                }
            });
        });
    }
    
    function formatNumber(num) {
        const abs = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        if (abs >= 1000000) {
            return sign + (abs / 1000000).toFixed(1) + 'M';
        } else if (abs >= 1000) {
            return sign + (abs / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
});
