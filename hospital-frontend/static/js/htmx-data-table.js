/**
 * Universal HTMX Data Table JavaScript Library
 * Provides common functionality for HTMX-enabled data tables
 */

class HTMXDataTable {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`HTMXDataTable: Container with ID '${containerId}' not found`);
            return;
        }

        this.options = {
            searchDelay: 300,
            loadingClass: 'htmx-loading',
            ...options
        };

        this.tableId = containerId.replace('dt-', '');
        this.searchTimeout = null;
        
        this.init();
    }

    init() {
        this.setupSearch();
        this.setupPerPage();
        this.setupBulkActions();
        this.setupExport();
        this.setupSorting();
        this.setupPagination();
        this.setupLoadingStates();
    }

    setupSearch() {
        const searchInput = this.container.querySelector(`#dt-${this.tableId}-search`);
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.updateFilters({ search: e.target.value, page: 1 });
                this.fetchData();
            }, this.options.searchDelay);
        });
    }

    setupPerPage() {
        const perPageSelect = this.container.querySelector(`#dt-${this.tableId}-per-page`);
        if (!perPageSelect) return;

        perPageSelect.addEventListener('change', (e) => {
            this.updateFilters({ per_page: e.target.value, page: 1 });
            this.fetchData();
        });
    }

    setupBulkActions() {
        const selectAll = this.container.querySelector(`#dt-${this.tableId}-select-all`);
        const bulkActionSelect = this.container.querySelector(`#dt-${this.tableId}-bulk-action`);
        const applyBulkButton = this.container.querySelector(`#dt-${this.tableId}-apply-bulk`);

        if (!selectAll) return;

        // Select all functionality
        selectAll.addEventListener('change', (e) => {
            const checkboxes = this.container.querySelectorAll(`input.dt-${this.tableId}-row`);
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            this.updateBulkControls();
        });

        // Update bulk controls when individual checkboxes change
        this.container.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains(`dt-${this.tableId}-row`)) {
                this.updateBulkControls();
            }
        });

        // Apply bulk action
        if (applyBulkButton && bulkActionSelect) {
            applyBulkButton.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                const action = bulkActionSelect.value;
                
                if (selectedIds.length === 0 || !action) return;

                this.executeBulkAction(action, selectedIds);
            });
        }
    }

    setupExport() {
        const exportButton = this.container.querySelector('[data-export-url]');
        if (!exportButton) return;

        exportButton.addEventListener('click', () => {
            const baseUrl = exportButton.dataset.exportUrl;
            const params = this.getCurrentFilters();
            const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + params.toString();
            
            // Trigger download
            window.location.href = url;
        });
    }

    setupSorting() {
        this.container.addEventListener('click', (e) => {
            const sortLink = e.target.closest('.sort-link');
            if (!sortLink) return;

            e.preventDefault();
            const key = sortLink.dataset.key;
            const currentSort = this.getFilterValue('sort');
            const currentDirection = this.getFilterValue('direction') || 'asc';
            
            let newDirection = 'asc';
            if (currentSort === key && currentDirection === 'asc') {
                newDirection = 'desc';
            }

            this.updateFilters({ 
                sort: key, 
                direction: newDirection 
            });
            this.fetchData();
        });
    }

    setupPagination() {
        this.container.addEventListener('click', (e) => {
            const pageButton = e.target.closest('[data-page]');
            if (!pageButton || pageButton.disabled) return;

            e.preventDefault();
            const page = pageButton.dataset.page;
            if (!page) return;

            this.updateFilters({ page });
            this.fetchData();
        });
    }

    setupLoadingStates() {
        // Add loading indicators for HTMX requests
        this.container.addEventListener('htmx:beforeRequest', (e) => {
            this.showLoading();
        });

        this.container.addEventListener('htmx:afterRequest', (e) => {
            this.hideLoading();
            
            // Update bulk controls after content changes
            setTimeout(() => this.updateBulkControls(), 100);
        });
    }

    updateFilters(newFilters) {
        const filtersForm = this.container.querySelector(`#dt-${this.tableId}-filters`);
        if (!filtersForm) return;

        Object.entries(newFilters).forEach(([key, value]) => {
            let input = filtersForm.querySelector(`input[name="${key}"]`);
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                filtersForm.appendChild(input);
            }
            input.value = value || '';
        });
    }

    getCurrentFilters() {
        const filtersForm = this.container.querySelector(`#dt-${this.tableId}-filters`);
        if (!filtersForm) return new URLSearchParams();

        return new URLSearchParams(new FormData(filtersForm));
    }

    getFilterValue(key) {
        const input = this.container.querySelector(`#dt-${this.tableId}-filters input[name="${key}"]`);
        return input ? input.value : null;
    }

    fetchData(extraParams = {}) {
        const params = this.getCurrentFilters();
        
        // Add extra parameters
        Object.entries(extraParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.set(key, value);
            }
        });

        const listUrl = this.options.listUrl || this.container.dataset.listUrl;
        if (!listUrl) {
            console.error('HTMXDataTable: No list URL configured');
            return;
        }

        const url = listUrl + (listUrl.includes('?') ? '&' : '?') + params.toString();
        
        // Fetch table body
        htmx.ajax('GET', url, { 
            target: `#dt-${this.tableId}-body`,
            swap: 'innerHTML'
        });

        // Fetch pagination if supported
        htmx.ajax('GET', url + '&partial=pagination', {
            target: `#dt-${this.tableId}-pagination`,
            swap: 'innerHTML'
        });
    }

    getSelectedIds() {
        const checkboxes = this.container.querySelectorAll(`input.dt-${this.tableId}-row:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    updateBulkControls() {
        const selectAll = this.container.querySelector(`#dt-${this.tableId}-select-all`);
        const applyBulkButton = this.container.querySelector(`#dt-${this.tableId}-apply-bulk`);
        const bulkActionSelect = this.container.querySelector(`#dt-${this.tableId}-bulk-action`);
        
        const allCheckboxes = this.container.querySelectorAll(`input.dt-${this.tableId}-row`);
        const checkedCheckboxes = this.container.querySelectorAll(`input.dt-${this.tableId}-row:checked`);
        
        // Update select all state
        if (selectAll) {
            if (checkedCheckboxes.length === 0) {
                selectAll.indeterminate = false;
                selectAll.checked = false;
            } else if (checkedCheckboxes.length === allCheckboxes.length) {
                selectAll.indeterminate = false;
                selectAll.checked = true;
            } else {
                selectAll.indeterminate = true;
                selectAll.checked = false;
            }
        }

        // Enable/disable bulk action button
        if (applyBulkButton) {
            const hasSelection = checkedCheckboxes.length > 0;
            const hasAction = bulkActionSelect ? bulkActionSelect.value : true;
            applyBulkButton.disabled = !hasSelection || !hasAction;
        }
    }

    executeBulkAction(action, selectedIds) {
        const bulkUrl = this.options.bulkUrl || this.container.dataset.bulkUrl;
        if (!bulkUrl) {
            console.error('HTMXDataTable: No bulk action URL configured');
            return;
        }

        const formData = new FormData();
        formData.append('action', action);
        selectedIds.forEach(id => formData.append('selected_ids', id));
        
        // Get CSRF token
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfToken) {
            formData.append('csrfmiddlewaretoken', csrfToken.value);
        }

        htmx.ajax('POST', bulkUrl, {
            values: formData,
            target: `#dt-${this.tableId}-body`,
            swap: 'innerHTML'
        });
    }

    showLoading() {
        this.container.classList.add(this.options.loadingClass);
        
        const tbody = this.container.querySelector(`#dt-${this.tableId}-body`);
        if (tbody) {
            tbody.style.opacity = '0.6';
            tbody.style.pointerEvents = 'none';
        }
    }

    hideLoading() {
        this.container.classList.remove(this.options.loadingClass);
        
        const tbody = this.container.querySelector(`#dt-${this.tableId}-body`);
        if (tbody) {
            tbody.style.opacity = '';
            tbody.style.pointerEvents = '';
        }
    }

    refresh() {
        this.fetchData();
    }

    clearFilters() {
        // Reset all filter inputs
        const filtersForm = this.container.querySelector(`#dt-${this.tableId}-filters`);
        if (filtersForm) {
            filtersForm.reset();
        }

        // Reset UI controls
        const searchInput = this.container.querySelector(`#dt-${this.tableId}-search`);
        if (searchInput) searchInput.value = '';

        const perPageSelect = this.container.querySelector(`#dt-${this.tableId}-per-page`);
        if (perPageSelect) perPageSelect.selectedIndex = 0;

        this.fetchData();
    }

    destroy() {
        // Clean up event listeners and timeouts
        clearTimeout(this.searchTimeout);
        
        // Remove event listeners would go here if we were tracking them
        // For now, since we use event delegation, just clear the container reference
        this.container = null;
    }
}

// Global utility function to initialize data tables
window.initDataTable = function(containerId, options = {}) {
    return new HTMXDataTable(containerId, options);
};

// Auto-initialize data tables with data attributes
document.addEventListener('DOMContentLoaded', function() {
    const tables = document.querySelectorAll('[data-htmx-table]');
    tables.forEach(table => {
        const options = {
            listUrl: table.dataset.listUrl,
            bulkUrl: table.dataset.bulkUrl,
            searchDelay: parseInt(table.dataset.searchDelay) || 300,
        };
        
        new HTMXDataTable(table.id, options);
    });
});
