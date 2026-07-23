
document.addEventListener('DOMContentLoaded', function() {
    const deleteBtns = document.querySelectorAll('.delete-btn');
    const renameBtns = document.querySelectorAll('.rename-btn');
    const modal = document.getElementById('rename-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelRenameBtn = document.getElementById('cancel-rename');
    const saveRenameBtn = document.getElementById('save-rename');
    const renameNameInput = document.getElementById('rename-name');
    const renameDescInput = document.getElementById('rename-description');

    let currentUuid = '';

    // Apply gradients when DOM is ready
    if (window.applyThemeGradients) {
        window.applyThemeGradients();
    }

    renameBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currentUuid = this.dataset.uuid;
            renameNameInput.value = this.dataset.name;
            renameDescInput.value = this.dataset.description || '';
            modal.style.display = 'flex';
        });
    });
    
    function closeModal() {
        modal.style.display = 'none';
        currentUuid = '';
    }
    
    closeModalBtn.addEventListener('click', closeModal);
    cancelRenameBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
saveRenameBtn.addEventListener('click', async function() {
    const newName = renameNameInput.value.trim();
    const newDesc = renameDescInput.value.trim();

    if (!newName) {
      alert('Please enter a theme name');
      return;
    }

    try {
      const response = await fetch('/api/theme/name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: currentUuid,
          name: newName,
          description: newDesc
        })
      });

      const result = await response.json();

      if (result.ok) {
        const card = document.querySelector(`[data-uuid="${currentUuid}"]`);
        const nameEl = card.querySelector('.theme-name');
        const descEl = card.querySelector('.theme-description');

        if (nameEl) {
          nameEl.textContent = newName;
        }
        if (descEl) {
          descEl.textContent = newDesc;
        }

        renameBtns.forEach(btn => {
          if (btn.dataset.uuid === currentUuid) {
            btn.dataset.name = newName;
            btn.dataset.description = newDesc;
          }
        });

        closeModal();
      } else {
        alert('Failed to rename theme: ' + result.error);
      }
    } catch (error) {
      console.error('Rename error:', error);
      alert('An error occurred. Please try again.');
    }
  });
    
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const uuid = this.dataset.uuid;
            
            if (confirm('Are you sure you want to delete this theme?')) {
                try {
                    const response = await fetch(`/api/theme?uuid=${uuid}`, {
                        method: 'DELETE'
                    });
                    
                    const result = await response.json();
                    
                    if (result.ok) {
                        const card = this.closest('.theme-card');
                        card.remove();
                        
                        if (!document.querySelectorAll('.theme-card').length) {
                            window.location.reload();
                        }
                    } else {
                        alert('Failed to delete theme: ' + result.error);
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('An error occurred. Please try again.');
                }
            }
        });
    });
});
