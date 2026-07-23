document.addEventListener('DOMContentLoaded', function() {
    initializeEditThemeModal()
})

function initializeEditThemeModal() {
    const editBtn = document.getElementById('edit-theme-btn')
    if (!editBtn) return

    const modal = document.getElementById('edit-theme-modal')
    const form = document.getElementById('edit-theme-form')
    const uuidInput = document.getElementById('edit-theme-uuid')
    const nameInput = document.getElementById('edit-theme-name')
    const descInput = document.getElementById('edit-theme-description')
    const saveBtn = document.getElementById('edit-theme-save-btn')

    editBtn.addEventListener('click', function() {
        uuidInput.value = this.dataset.uuid
        nameInput.value = this.dataset.name
        descInput.value = this.dataset.description
        modal.style.display = 'flex'
    })

    form.addEventListener('submit', async function(e) {
        e.preventDefault()

        const originalText = saveBtn.innerHTML
        saveBtn.disabled = true
        saveBtn.innerHTML = '<i data-lucide="loader"></i> Saving...'
        lucide.createIcons()

        const uuid = uuidInput.value
        const name = nameInput.value.trim()
        const description = descInput.value.trim()

        if (!name) {
            saveBtn.disabled = false
            saveBtn.innerHTML = originalText
            lucide.createIcons()
            return
        }

        try {
            const response = await fetch('/api/theme/name', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uuid: uuid,
                    name: name,
                    description: description
                }),
                credentials: 'include'
            })

            const data = await response.json()

            if (data.ok) {
                updateThemeInUI(name, description)
                modal.style.display = 'none'
            } else {
                alert(data.error || 'Failed to update theme')
            }
        } catch (error) {
            console.error('Update error:', error)
            alert('Failed to update theme. Please try again.')
        } finally {
            saveBtn.disabled = false
            saveBtn.innerHTML = originalText
            lucide.createIcons()
        }
    })

    document.querySelectorAll('[data-close-modal="edit-theme-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none'
        })
    })

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none'
        }
    })
}

function updateThemeInUI(name, description) {
    const titleEl = document.querySelector('.theme-title')
    const descEl = document.querySelector('.theme-description p')
    const editBtn = document.getElementById('edit-theme-btn')

    if (titleEl) titleEl.textContent = name
    if (descEl) descEl.textContent = description || 'No description provided.'
    if (editBtn) {
        editBtn.dataset.name = name
        editBtn.dataset.description = description
    }
}