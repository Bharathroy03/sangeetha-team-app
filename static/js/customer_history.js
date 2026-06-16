document.addEventListener('DOMContentLoaded', () => {
    // Page Elements
    const ledgerTableBody = document.getElementById('ledgerTableBody');
    const ledgerCardList = document.getElementById('ledgerCardList');
    const ledgerCount = document.getElementById('ledgerCount');
    const ledgerSearch = document.getElementById('ledgerSearch');
    const filterStartDate = document.getElementById('filterStartDate');
    const filterEndDate = document.getElementById('filterEndDate');
    const btnClearDateFilters = document.getElementById('btnClearDateFilters');
    const btnClearDateFiltersMobile = document.getElementById('btnClearDateFiltersMobile');

    // Sidebar/Header Elements
    const btnLogout = document.getElementById('btnLogout');
    const btnLogoutMobile = document.getElementById('btnLogoutMobile');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('side-nav');
    const overlay = document.getElementById('sidebar-overlay');

    let allCustomers = [];

    // --- TOAST ALERTS SYSTEM ---
    window.showToast = (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        // Show backdrop blur overlay
        let backdrop = document.getElementById('toastBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'toastBackdrop';
            document.body.appendChild(backdrop);
        }
        backdrop.classList.add('active');

        // Auto-fade out backdrop
        setTimeout(() => {
            backdrop.classList.remove('active');
        }, 1000);

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = type === 'success'
            ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
            : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

        toast.innerHTML = `
            <div class="toast-content">${icon}<span>${message}</span></div>
            <span class="toast-close">&times;</span>
            <div class="toast-progress"></div>
        `;

        container.appendChild(toast);
        const dismiss = () => {
            toast.style.animation = 'toastPopOut 0.35s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards';
            setTimeout(() => toast.remove(), 350);
        };
        toast.querySelector('.toast-close').addEventListener('click', dismiss);
        setTimeout(() => { if (toast.parentNode) dismiss(); }, 4000);
    };

    // --- LOGOUT ACTION ---
    const logoutAction = async () => {
        try {
            const res = await fetch('/api/logout', { method: 'POST' });
            if (res.ok) {
                window.location.href = '/login';
            }
        } catch (err) {
            window.location.href = '/login';
        }
    };
    if (btnLogout) btnLogout.addEventListener('click', logoutAction);
    if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', logoutAction);

    // --- SIDEBAR TOGGLE ---
    const toggleSidebar = () => {
        if (!sidebar) return;
        const isHidden = sidebar.classList.contains('-translate-x-full');
        if (isHidden) {
            sidebar.classList.remove('-translate-x-full');
            if (overlay) overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    };
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    // --- LEDGER TABLE POPULATION ---
    const loadCustomers = async () => {
        try {
            const response = await fetch('/api/customers');
            const res = await response.json();
            if (response.ok && res.success) {
                allCustomers = res.data || [];
                renderLedgerTable();
            } else {
                window.showToast(res.message || 'Failed to load customer records.', 'error');
            }
        } catch (err) {
            window.showToast('Network error while loading records.', 'error');
        }
    };

    const renderLedgerTable = () => {
        if (!ledgerTableBody) return;

        let filtered = allCustomers;

        // Apply Date range
        const startVal = filterStartDate ? filterStartDate.value : '';
        const endVal = filterEndDate ? filterEndDate.value : '';
        if (startVal) {
            filtered = filtered.filter(c => c.created_at && c.created_at.split(' ')[0] >= startVal);
        }
        if (endVal) {
            filtered = filtered.filter(c => c.created_at && c.created_at.split(' ')[0] <= endVal);
        }

        // Apply Search query
        const query = ledgerSearch ? ledgerSearch.value.trim().toLowerCase() : '';
        if (query) {
            filtered = filtered.filter(c =>
                (c.customer_name || '').toLowerCase().includes(query) ||
                (c.mobile_number || '').includes(query) ||
                (c.imei_number || '').includes(query) ||
                (c.item_model || '').toLowerCase().includes(query) ||
                (c.sales_person || '').toLowerCase().includes(query)
            );
        }

        if (ledgerCount) {
            ledgerCount.textContent = `Showing ${filtered.length} record${filtered.length === 1 ? '' : 's'}`;
        }

        if (filtered.length === 0) {
            ledgerTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-12 text-center text-on-surface-variant opacity-60">
                        No customer entries found matching filters.
                    </td>
                </tr>
            `;
            if (ledgerCardList) {
                ledgerCardList.innerHTML = `
                    <div class="px-4 py-10 text-center text-on-surface-variant opacity-60 text-sm">
                        No customer entries found matching filters.
                    </div>
                `;
            }
            return;
        }

        // Render records newest to oldest
        const renderedRecords = [...filtered].sort((a, b) => {
            const timeA = a.created_at || '';
            const timeB = b.created_at || '';
            return timeB.localeCompare(timeA);
        });

        ledgerTableBody.innerHTML = renderedRecords.map(item => {
            const hasDeletePermission = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
            const isLocked = !!item.record_locked;
            const canDelete = (window.currentUserRole === 'super_admin') || (window.currentUserRole === 'admin' && !isLocked);
            const editButton = hasDeletePermission ? `
                <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-1.5 rounded-lg hover:bg-orange-50" title="Edit Record">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
            ` : `
                <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-1.5 rounded-lg hover:bg-orange-50" title="Request Edit">
                    <span class="material-symbols-outlined text-[18px]">edit_note</span>
                </button>
            `;
            return `
                <tr class="odd:bg-[#0D70C0]/5 even:bg-white hover:bg-[#0D70C0]/10 transition-colors duration-200 group">
                    <td class="px-6 py-4 font-data-mono text-body-sm text-on-surface-variant whitespace-nowrap">${escapeHtml(item.created_at)}</td>
                    <td class="px-6 py-4 font-bold text-primary hover:underline cursor-pointer whitespace-nowrap" onclick="viewCustomer('${item.customer_id}')">
                        ${escapeHtml(item.customer_name)}
                    </td>
                    <td class="px-6 py-4 text-on-surface font-medium whitespace-nowrap">${escapeHtml(item.item_model)}</td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex justify-end gap-2">
                            <button onclick="viewCustomer('${item.customer_id}')" class="text-primary hover:text-blue-800 transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="View Details">
                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            ${editButton}
                            ${canDelete ? `
                            <button onclick="deleteRecord('${item.customer_id}')" class="text-error hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Delete customer row">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Mobile Card List
        if (ledgerCardList) {
            ledgerCardList.innerHTML = renderedRecords.map((item, idx) => {
                const hasDeletePermission = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
                const isLocked = !!item.record_locked;
                const canDelete = (window.currentUserRole === 'super_admin') || (window.currentUserRole === 'admin' && !isLocked);
                const editButtonMobile = hasDeletePermission ? `
                    <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50" title="Edit details">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                ` : `
                    <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50" title="Request Edit">
                        <span class="material-symbols-outlined text-[20px]">edit_note</span>
                    </button>
                `;
                return `
                <div class="bg-white border-b border-outline-variant last:border-b-0">
                    <div class="flex items-center justify-between px-4 py-3.5 ${idx % 2 === 0 ? 'bg-[#0D70C0]/5' : 'bg-white'}">
                        <div class="flex items-center gap-3 min-w-0 cursor-pointer" onclick="viewCustomer('${item.customer_id}')">
                            <div class="w-9 h-9 rounded-full bg-[#0D70C0]/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                                ${escapeHtml(item.customer_name.charAt(0).toUpperCase())}
                            </div>
                            <div class="min-w-0">
                                <p class="font-bold text-primary hover:underline text-[15px] leading-tight">${escapeHtml(item.customer_name)}</p>
                                <p class="text-xs text-on-surface-variant font-medium mt-0.5">${escapeHtml(item.item_model)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button onclick="viewCustomer('${item.customer_id}')" class="text-primary hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50" title="View details">
                                <span class="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            ${editButtonMobile}
                            ${canDelete ? `
                            <button onclick="deleteRecord('${item.customer_id}')" class="text-rose-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50" title="Delete record">
                                <span class="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }
    };

    if (ledgerSearch) ledgerSearch.addEventListener('input', renderLedgerTable);
    if (filterStartDate) filterStartDate.addEventListener('change', renderLedgerTable);
    if (filterEndDate) filterEndDate.addEventListener('change', renderLedgerTable);

    const clearDateFilters = () => {
        if (filterStartDate) filterStartDate.value = '';
        if (filterEndDate) filterEndDate.value = '';
        renderLedgerTable();
    };

    if (btnClearDateFilters) btnClearDateFilters.addEventListener('click', clearDateFilters);
    if (btnClearDateFiltersMobile) btnClearDateFiltersMobile.addEventListener('click', clearDateFilters);

    // --- VIEW DETAILS MODAL ---
    window.viewCustomer = (customerId) => {
        const item = allCustomers.find(c => c.customer_id === customerId);
        if (!item) return;

        // Populate fields in customer history details modal
        document.getElementById('detail_created_at').textContent = item.created_at || '—';
        document.getElementById('detail_customer_name').textContent = item.customer_name || '—';
        document.getElementById('detail_mobile_number').textContent = item.mobile_number || '—';
        document.getElementById('detail_item_model').textContent = item.item_model || '—';
        document.getElementById('detail_imei_number').textContent = item.imei_number || '—';
        document.getElementById('detail_transaction_mode').textContent = item.transaction_mode || '—';
        document.getElementById('detail_payment_mode').textContent = item.down_payment_mode || item.payment_mode || '—';
        document.getElementById('detail_exchange_status').textContent = item.exchange_status || '—';
        document.getElementById('detail_sales_person').textContent = item.sales_person || '—';

        const displayAmount = item.total_amount_received
            ? `₹${parseFloat(item.total_amount_received).toLocaleString('en-IN')}`
            : '₹0';
        document.getElementById('detail_amount_received').textContent = displayAmount;

        const detailDownPmtSec = document.getElementById('detail_down_payment_section');
        const detailDownPmt = document.getElementById('detail_down_payment');
        const detailFinanceSec = document.getElementById('detail_finance_provider_section');
        const detailFinanceProv = document.getElementById('detail_finance_provider');

        if (item.transaction_mode === 'Finance') {
            if (detailDownPmtSec) detailDownPmtSec.classList.remove('hidden');
            if (detailFinanceSec) detailFinanceSec.classList.remove('hidden');
            
            const downPmtVal = item.down_payment_value
                ? `₹${parseFloat(item.down_payment_value).toLocaleString('en-IN')}`
                : '₹0';
            if (detailDownPmt) detailDownPmt.textContent = downPmtVal;
            if (detailFinanceProv) detailFinanceProv.textContent = item.finance_provider || '—';
        } else {
            if (detailDownPmtSec) detailDownPmtSec.classList.add('hidden');
            if (detailFinanceSec) detailFinanceSec.classList.add('hidden');
        }

        // Configure delete button based on permissions
        const btnDelete = document.getElementById('btnDeleteFromModal');
        if (btnDelete) {
            const isLocked = !!item.record_locked;
            const canDelete = (window.currentUserRole === 'super_admin') || (window.currentUserRole === 'admin' && !isLocked);
            if (canDelete) {
                btnDelete.classList.remove('hidden');
                btnDelete.onclick = () => {
                    deleteRecord(customerId);
                };
            } else {
                btnDelete.classList.add('hidden');
            }
        }

        // Configure edit button
        const btnEdit = document.getElementById('btnEditFromModal');
        if (btnEdit) {
            const hasEditPermission = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
            if (hasEditPermission) {
                btnEdit.innerHTML = `<span class="material-symbols-outlined text-[16px]">edit</span> Edit Record`;
            } else {
                btnEdit.innerHTML = `<span class="material-symbols-outlined text-[16px]">edit_note</span> Request Edit`;
            }
            btnEdit.onclick = () => {
                editCustomerDirectly(customerId);
            };
        }

        const modal = document.getElementById('customerDetailModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.closeCustomerDetailModal = () => {
        const modal = document.getElementById('customerDetailModal');
        if (modal) modal.classList.add('hidden');
    };

    // --- ACTIONS ---
    window.editCustomerDirectly = (customerId) => {
        window.location.href = `/customers/${customerId}/request-edit`;
    };

    window.deleteRecord = async (customerId) => {
        const confirmed = await window.showConfirm(
            'Are you sure you want to delete this customer record? This action is permanent.',
            'danger',
            'Delete Customer Record'
        );
        if (!confirmed) return;

        window.showLoading('Deleting customer record...');
        try {
            const response = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
            const res = await response.json();

            if (response.ok && res.success) {
                window.showToast('Customer record deleted successfully.', 'success');
                window.closeCustomerDetailModal();
                loadCustomers();
            } else {
                window.showToast(res.message || 'Failed to delete record.', 'error');
            }
        } catch (err) {
            window.showToast('Network error while deleting.', 'error');
        } finally {
            window.hideLoading();
        }
    };

    const escapeHtml = (text) => {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    };

    // Load initial data
    loadCustomers();
});
