// Configuration
const API_BASE_URL = 'http://localhost:5000'; // Adjust this to your server URL

// State
let allItems = [];
let filteredItems = [];
let selectedItems = new Set();

// DOM Elements
let contentListEl, totalItemsEl, selectedItemsEl, dateFromEl, dateToEl,
    applyFilterBtn, clearFilterBtn, selectAllBtn, deselectAllBtn, deleteSelectedBtn;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements after DOM is loaded
    contentListEl = document.getElementById('content-list');
    const totalItems = document.getElementById('total-items');
    const selectedItems = document.getElementById('selected-items');

    totalItemsEl = totalItems ? totalItems.querySelector('span') : null;
    selectedItemsEl = selectedItems ? selectedItems.querySelector('span') : null;

    dateFromEl = document.getElementById('date-from');
    dateToEl = document.getElementById('date-to');
    applyFilterBtn = document.getElementById('apply-filter');
    clearFilterBtn = document.getElementById('clear-filter');
    selectAllBtn = document.getElementById('select-all');
    deselectAllBtn = document.getElementById('deselect-all');
    deleteSelectedBtn = document.getElementById('delete-selected');

    // Now proceed with the rest of the initialization
    fetchContent();

    // Event listeners
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyDateFilter);
    if (clearFilterBtn) clearFilterBtn.addEventListener('click', clearFilter);
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAll);
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAll);
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', deleteSelected);
});

// Fetch content from API
async function fetchContent() {
    contentListEl.innerHTML = '<div class="loading">Loading content...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/list-content`);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        allItems = data.items;
        filteredItems = [...allItems];

        updateStats();
        renderContentList();
    } catch (error) {
        console.error('Error fetching content:', error);
        contentListEl.innerHTML = `
            <div class="no-items">
                Error loading content. Please ensure the server is running at ${API_BASE_URL}.
            </div>
        `;
    }
}

// Render content list
function renderContentList() {
    if (filteredItems.length === 0) {
        contentListEl.innerHTML = '<div class="no-items">No content found.</div>';
        return;
    }

    contentListEl.innerHTML = '';

    filteredItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'content-item';
        itemEl.dataset.id = item.id;

        const isSelected = selectedItems.has(item.id);

        itemEl.innerHTML = `
            <div class="item-check">
                <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" ${isSelected ? 'checked' : ''}>
            </div>
            <div class="item-details">
                <div class="item-title">${escapeHtml(item.title)}</div>
                <div class="item-url">${escapeHtml(item.url)}</div>
                <div class="item-date">Captured on: ${formatDate(item.date)}</div>
                <div class="item-preview">${escapeHtml(item.content_preview)}</div>
            </div>
        `;

        contentListEl.appendChild(itemEl);

        // Find checkbox using a class selector and data attribute
        const checkbox = itemEl.querySelector('.item-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                selectedItems.add(item.id);
            } else {
                selectedItems.delete(item.id);
            }
            updateStats();
        });
    }
});
}

// Apply date filter
function applyDateFilter() {
    const fromDate = dateFromEl.value ? new Date(dateFromEl.value) : null;
    const toDate = dateToEl.value ? new Date(dateToEl.value) : null;

    if (!fromDate && !toDate) {
        // If both dates are empty, show all items
        filteredItems = [...allItems];
    } else {
        filteredItems = allItems.filter(item => {
            const itemDate = new Date(item.date);

            if (fromDate && toDate) {
                return itemDate >= fromDate && itemDate <= toDate;
            } else if (fromDate) {
                return itemDate >= fromDate;
            } else if (toDate) {
                return itemDate <= toDate;
            }

            return true;
        });
    }

    renderContentList();
    updateStats();
}

// Clear filter
function clearFilter() {
    dateFromEl.value = '';
    dateToEl.value = '';
    filteredItems = [...allItems];
    renderContentList();
    updateStats();
}

// Select all items
function selectAll() {
    filteredItems.forEach(item => {
        selectedItems.add(item.id);
    });

    const checkboxes = contentListEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });

    updateStats();
}

// Deselect all items
function deselectAll() {
    selectedItems.clear();

    const checkboxes = contentListEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    updateStats();
}

// Delete selected items
async function deleteSelected() {
    if (selectedItems.size === 0) {
        alert('No items selected');
        return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete ${selectedItems.size} items?`);
    if (!confirmDelete) return;

    // Convert Set to Array
    const itemsToDelete = Array.from(selectedItems);

    // Show loading state
    deleteSelectedBtn.textContent = 'Deleting...';
    deleteSelectedBtn.disabled = true;

    try {
        // Delete items one by one
        for (const docId of itemsToDelete) {
            await fetch(`${API_BASE_URL}/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ doc_id: docId })
            });
        }

        // Refresh content after deletion
        selectedItems.clear();
        await fetchContent();

        alert('Selected items deleted successfully');
    } catch (error) {
        console.error('Error deleting items:', error);
        alert('Error deleting items. See console for details.');
    } finally {
        // Reset button state
        deleteSelectedBtn.textContent = 'Delete Selected';
        deleteSelectedBtn.disabled = false;
    }
}

// Update statistics
function updateStats() {
    totalItemsEl.textContent = filteredItems.length;
    selectedItemsEl.textContent = selectedItems.size;
}

// Helper: Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}