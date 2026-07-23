let currentAction = null

document.addEventListener('DOMContentLoaded', () => {
    setupDownloadAllThemes()
    setupDeleteAllData()
    setupLogout()
    setupModal()
})

function setupDropdown() {
    const userMenuBtn = document.getElementById('user-menu-btn')
    const dropdownMenu = document.getElementById('dropdown-menu')

    if (!userMenuBtn || !dropdownMenu) return

    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const isHidden = dropdownMenu.style.display === 'none' || dropdownMenu.style.display === ''
        dropdownMenu.style.display = isHidden ? 'block' : 'none'
    })

    document.addEventListener('click', () => {
        dropdownMenu.style.display = 'none'
    })

    dropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation()
    })

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdownMenu.style.display = 'none'
        }
    })
}

function setupModal() {
    const modal = document.getElementById('confirm-modal')
    const closeModal = document.getElementById('close-modal')
    const cancelModal = document.getElementById('cancel-modal')
    const confirmBtn = document.getElementById('confirm-modal-btn')

    closeModal.addEventListener('click', closeModalFn)
    cancelModal.addEventListener('click', closeModalFn)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalFn()
    })

    confirmBtn.addEventListener('click', executeAction)
}

function closeModalFn() {
    document.getElementById('confirm-modal').style.display = 'none'
    currentAction = null
}

function openConfirmModal(message, action) {
    document.getElementById('modal-message').textContent = message
    currentAction = action
    document.getElementById('confirm-modal').style.display = 'flex'
}

function executeAction() {
    if (!currentAction) return

    closeModalFn()

    setTimeout(() => {
        currentAction()
    }, 300)
}

function setupDownloadAllThemes() {
    const downloadBtn = document.getElementById('download-all-btn')
    downloadBtn.addEventListener('click', async () => {
        try {
            downloadBtn.disabled = true
            downloadBtn.innerHTML = '<i data-lucide="loader"></i> Downloading...'

            const response = await fetch('/api/settings/download', {
                method: 'GET',
                credentials: 'include'
            })

            const data = await response.json()

            if (data.ok && data.themes.length > 0) {
                downloadThemesAsZip(data.themes, data.username)
            } else {
                alert('No themes found to download.')
            }
        } catch (error) {
            console.error('Download error:', error)
            alert('Failed to download themes. Please try again.')
        } finally {
            downloadBtn.disabled = false
            downloadBtn.innerHTML = '<i data-lucide="download"></i> Download All Themes'
            lucide.createIcons()
        }
    })
}

function downloadThemesAsZip(themes, username) {
    themes.forEach((theme, index) => {
        const filename = `${theme.uuid}.json`
        const content = JSON.stringify(theme, null, 2)
        const blob = new Blob([content], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    })
}

function setupDeleteAllData() {
    const deleteBtn = document.getElementById('delete-data-btn')
    deleteBtn.addEventListener('click', () => {
        openConfirmModal(
            'Are you sure you want to delete all your themes and user data? This action cannot be undone.',
            async () => {
                try {
                    deleteBtn.disabled = true
                    deleteBtn.innerHTML = '<i data-lucide="loader"></i> Deleting...'

                    const response = await fetch('/api/settings/user-data', {
                        method: 'DELETE',
                        credentials: 'include'
                    })

                    const data = await response.json()

                    if (data.ok) {
                        alert('All your data has been deleted successfully.')
                        window.location.href = '/'
                    } else {
                        alert('Failed to delete data. Please try again.')
                    }
                } catch (error) {
                    console.error('Delete error:', error)
                    alert('Failed to delete data. Please try again.')
                } finally {
                    deleteBtn.disabled = false
                    deleteBtn.innerHTML = '<i data-lucide="trash-2"></i> Delete All Themes & Data'
                    lucide.createIcons()
                }
            }
        )
    })
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn')
    logoutBtn.addEventListener('click', () => {
        openConfirmModal(
            'Are you sure you want to logout from your account?',
            async () => {
                try {
                    logoutBtn.disabled = true
                    logoutBtn.innerHTML = '<i data-lucide="loader"></i> Logging out...'

                    const response = await fetch('/api/logout', {
                        method: 'GET',
                        credentials: 'include'
                    })

                    if (response.ok) {
                        window.location.href = '/'
                    } else {
                        alert('Failed to logout. Please try again.')
                    }
                } catch (error) {
                    console.error('Logout error:', error)
                    alert('Failed to logout. Please try again.')
                } finally {
                    logoutBtn.disabled = false
                    logoutBtn.innerHTML = '<i data-lucide="log-out"></i> Logout from Account'
                    lucide.createIcons()
                }
            }
        )
    })
}
