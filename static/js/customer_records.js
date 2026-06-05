document.addEventListener('DOMContentLoaded', () => {
    // --- TAB SWITCHING SYSTEM ---
    window.switchRecordTab = (tab) => {
        const tabs = ['today', 'total', 'finance', 'payments'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            if (t === tab) {
                btn.className = "w-full px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 bg-[#0D70C0] text-white shadow-md border-2 border-[#EE8133] scale-[1.02] transition-all duration-300 ease-out transform active:scale-95";
            } else {
                btn.className = "w-full px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#0D70C0] bg-slate-50/40 hover:bg-[#0D70C0]/5 border border-slate-200 hover:border-[#0D70C0]/30 transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2";
            }
        });

        const custContent = document.getElementById('tab-content-customers');
        const payContent = document.getElementById('tab-content-payments');

        if (tab === 'payments') {
            if (custContent) custContent.classList.add('hidden');
            if (payContent) payContent.classList.remove('hidden');
            fetchPayments();
        } else {
            if (payContent) payContent.classList.add('hidden');
            if (custContent) custContent.classList.remove('hidden');
            currentLedgerFilter = tab.toUpperCase();
            
            // Set header title
            const recordsTitle = document.getElementById('records-title');
            if (recordsTitle) {
                const titles = {
                    'TODAY': "Today's Customer Registrations",
                    'TOTAL': "Total Customers Directory",
                    'FINANCE': "Finance EMI Ledgers"
                };
                recordsTitle.textContent = titles[currentLedgerFilter];
            }
            renderLedgerTable();
        }
    };

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const stringVal = String(text);
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return stringVal.replace(/[&<>"']/g, m => map[m]);
    }

    // --- LOGOUT ACTION ---
    const btnLogout = document.getElementById('btnLogout');
    const btnLogoutMobile = document.getElementById('btnLogoutMobile');
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

    // --- MOBILE SIDEBAR TOGGLE ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('side-nav');
    const overlay = document.getElementById('sidebar-overlay');
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

    // --- TOAST ALERTS SYSTEM ---
    window.showToast = (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        let backdrop = document.getElementById('toastBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'toastBackdrop';
            document.body.appendChild(backdrop);
        }
        backdrop.classList.add('active');
        setTimeout(() => backdrop.classList.remove('active'), 1000);

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



    // --- CUSTOMER HISTORY LEDGER CODE ---
    const ledgerTableBody = document.getElementById('ledgerTableBody');
    const ledgerCardList = document.getElementById('ledgerCardList');
    const ledgerCount = document.getElementById('ledgerCount');
    const ledgerSearch = document.getElementById('ledgerSearch');
    const filterStartDateCustomers = document.getElementById('filterStartDateCustomers');
    const filterEndDateCustomers = document.getElementById('filterEndDateCustomers');
    const btnClearDateFiltersCustomers = document.getElementById('btnClearDateFiltersCustomers');

    let allCustomers = [];
    let currentLedgerFilter = 'TODAY'; // TODAY, TOTAL, FINANCE

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

        // Apply tab filters
        const d = new Date();
        const todayStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
        if (currentLedgerFilter === 'TODAY') {
            filtered = filtered.filter(c => c.created_at && c.created_at.startsWith(todayStr));
        } else if (currentLedgerFilter === 'FINANCE') {
            filtered = filtered.filter(c => c.transaction_mode === 'Finance');
        }

        // Apply Date range
        const startVal = filterStartDateCustomers ? filterStartDateCustomers.value : '';
        const endVal = filterEndDateCustomers ? filterEndDateCustomers.value : '';
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
            ledgerTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-on-surface-variant opacity-60">No customer entries found matching filters.</td></tr>`;
            if (ledgerCardList) ledgerCardList.innerHTML = `<div class="px-4 py-10 text-center text-on-surface-variant opacity-60 text-sm">No customer entries found matching filters.</div>`;
            return;
        }

        const renderedRecords = [...filtered].reverse();
        ledgerTableBody.innerHTML = renderedRecords.map(item => {
            const hasDeletePermission = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
            const isLocked = !!item.record_locked;

            let editButton = '';
            if (isLocked) {
                editButton = `
                    <button class="text-slate-300 p-1.5 cursor-not-allowed" title="Record Locked (Billing Verified)" disabled>
                        <span class="material-symbols-outlined text-[18px]">lock</span>
                    </button>
                `;
            } else {
                editButton = hasDeletePermission ? `
                    <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-1.5 rounded-lg hover:bg-orange-50" title="Edit Record">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                ` : `
                    <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-1.5 rounded-lg hover:bg-orange-50" title="Request Edit">
                        <span class="material-symbols-outlined text-[18px]">edit_note</span>
                    </button>
                `;
            }

            const deleteButton = (hasDeletePermission && !isLocked) ? `
                <button onclick="deleteRecord('${item.customer_id}')" class="text-error hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Delete customer row">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            ` : '';

            const statusHtml = isLocked ? `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                    <span class="material-symbols-outlined text-[13px]">lock</span> Verified
                </span>
            ` : `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full">
                    <span class="material-symbols-outlined text-[13px]">lock_open</span> Pending
                </span>
            `;

            return `
                <tr class="odd:bg-[#0D70C0]/5 even:bg-white hover:bg-[#0D70C0]/10 transition-colors duration-200 group">
                    <td class="px-6 py-4 font-data-mono text-body-sm text-on-surface-variant whitespace-nowrap">${escapeHtml(item.created_at)}</td>
                    <td class="px-6 py-4 font-bold text-primary hover:underline cursor-pointer whitespace-nowrap" onclick="viewCustomer('${item.customer_id}')">
                        ${escapeHtml(item.customer_name)}
                    </td>
                    <td class="px-6 py-4 text-on-surface font-medium whitespace-nowrap">${escapeHtml(item.item_model)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${statusHtml}</td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex justify-end gap-2">
                            <button onclick="viewCustomer('${item.customer_id}')" class="text-primary hover:text-blue-800 transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="View Details">
                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            ${editButton}
                            ${deleteButton}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (ledgerCardList) {
            ledgerCardList.innerHTML = renderedRecords.map((item, idx) => {
                const hasDeletePermission = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
                const isLocked = !!item.record_locked;

                let editButtonMobile = '';
                if (isLocked) {
                    editButtonMobile = `
                        <button class="text-slate-300 p-2 cursor-not-allowed" title="Record Locked" disabled>
                            <span class="material-symbols-outlined text-[20px]">lock</span>
                        </button>
                    `;
                } else {
                    editButtonMobile = hasDeletePermission ? `
                        <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50" title="Edit details">
                            <span class="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                    ` : `
                        <button onclick="editCustomerDirectly('${item.customer_id}')" class="text-secondary hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50" title="Request Edit">
                            <span class="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                    `;
                }

                const deleteButtonMobile = (hasDeletePermission && !isLocked) ? `
                    <button onclick="deleteRecord('${item.customer_id}')" class="text-rose-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50" title="Delete record">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                ` : '';

                const statusBadgeMobile = isLocked ? `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-full mt-1">
                        <span class="material-symbols-outlined text-[10px]">lock</span> Verified
                    </span>
                ` : `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-full mt-1">
                        <span class="material-symbols-outlined text-[10px]">lock_open</span> Pending
                    </span>
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
                                ${statusBadgeMobile}
                            </div>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button onclick="viewCustomer('${item.customer_id}')" class="text-primary hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50" title="View details">
                                <span class="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            ${editButtonMobile}
                            ${deleteButtonMobile}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }
    };

    if (ledgerSearch) ledgerSearch.addEventListener('input', renderLedgerTable);
    if (filterStartDateCustomers) filterStartDateCustomers.addEventListener('change', renderLedgerTable);
    if (filterEndDateCustomers) filterEndDateCustomers.addEventListener('change', renderLedgerTable);
    if (btnClearDateFiltersCustomers) {
        btnClearDateFiltersCustomers.addEventListener('click', () => {
            filterStartDateCustomers.value = '';
            filterEndDateCustomers.value = '';
            renderLedgerTable();
        });
    }

    // View customer details modal
    window.viewCustomer = (customerId) => {
        const item = allCustomers.find(c => c.customer_id === customerId);
        if (!item) return;

        document.getElementById('detail_created_at').textContent = item.created_at || '—';
        document.getElementById('detail_customer_name').textContent = item.customer_name || '—';
        document.getElementById('detail_mobile_number').textContent = item.mobile_number || '—';
        document.getElementById('detail_item_model').textContent = item.item_model || '—';
        document.getElementById('detail_imei_number').textContent = item.imei_number || '—';
        document.getElementById('detail_transaction_mode').textContent = item.transaction_mode || '—';
        document.getElementById('detail_payment_mode').textContent = item.down_payment_mode || item.payment_mode || '—';
        document.getElementById('detail_exchange_status').textContent = item.exchange_status || '—';
        document.getElementById('detail_sales_person').textContent = item.sales_person || '—';

        const displayAmount = item.total_amount_received ? `₹${parseFloat(item.total_amount_received).toLocaleString('en-IN')}` : '₹0';
        document.getElementById('detail_amount_received').textContent = displayAmount;

        const detailDownPmtSec = document.getElementById('detail_down_payment_section');
        const detailDownPmt = document.getElementById('detail_down_payment');
        const detailFinanceSec = document.getElementById('detail_finance_provider_section');
        const detailFinanceProv = document.getElementById('detail_finance_provider');

        if (item.transaction_mode === 'Finance') {
            if (detailDownPmtSec) detailDownPmtSec.classList.remove('hidden');
            if (detailFinanceSec) detailFinanceSec.classList.remove('hidden');
            const downPmtVal = item.down_payment_value ? `₹${parseFloat(item.down_payment_value).toLocaleString('en-IN')}` : '₹0';
            if (detailDownPmt) detailDownPmt.textContent = downPmtVal;
            if (detailFinanceProv) detailFinanceProv.textContent = item.finance_provider || '—';
        } else {
            if (detailDownPmtSec) detailDownPmtSec.classList.add('hidden');
            if (detailFinanceSec) detailFinanceSec.classList.add('hidden');
        }

        const isLocked = !!item.record_locked;
        const detailBillingStatusBadge = document.getElementById('detail_billing_status_badge');
        if (detailBillingStatusBadge) {
            if (isLocked) {
                detailBillingStatusBadge.className = "px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 bg-emerald-100 text-emerald-800";
                detailBillingStatusBadge.innerHTML = `<span class="material-symbols-outlined text-[14px]">lock</span> Billing Verified`;
            } else {
                detailBillingStatusBadge.className = "px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 bg-amber-100 text-amber-800";
                detailBillingStatusBadge.innerHTML = `<span class="material-symbols-outlined text-[14px]">lock_open</span> Pending Verification`;
            }
        }

        // Verified sections
        const detailBillingVerifiedSection = document.getElementById('detail_billing_verified_section');
        const detailBillingVerifiedBy = document.getElementById('detail_billing_verified_by');
        const detailBillingVerifiedAt = document.getElementById('detail_billing_verified_at');
        const detailBillingAdminRemarks = document.getElementById('detail_billing_admin_remarks');

        if (item.billing_verified) {
            if (detailBillingVerifiedSection) detailBillingVerifiedSection.classList.remove('hidden');
            if (detailBillingVerifiedBy) detailBillingVerifiedBy.textContent = item.billing_verified_by || '—';
            if (detailBillingVerifiedAt) detailBillingVerifiedAt.textContent = item.billing_verified_at || '—';
            if (detailBillingAdminRemarks) detailBillingAdminRemarks.textContent = item.billing_admin_remarks || 'No remarks provided.';
        } else {
            if (detailBillingVerifiedSection) detailBillingVerifiedSection.classList.add('hidden');
        }

        // Reopened sections
        const detailBillingReopenedSection = document.getElementById('detail_billing_reopened_section');
        const detailReopenedBy = document.getElementById('detail_reopened_by');
        const detailReopenedAt = document.getElementById('detail_reopened_at');
        const detailReopenReason = document.getElementById('detail_reopen_reason');

        if (item.reopened_by) {
            if (detailBillingReopenedSection) detailBillingReopenedSection.classList.remove('hidden');
            if (detailReopenedBy) detailReopenedBy.textContent = item.reopened_by || '—';
            if (detailReopenedAt) detailReopenedAt.textContent = item.reopened_at || '—';
            if (detailReopenReason) detailReopenReason.textContent = item.reopen_reason || 'No reason provided.';
        } else {
            if (detailBillingReopenedSection) detailBillingReopenedSection.classList.add('hidden');
        }

        const btnDelete = document.getElementById('btnDeleteFromModal');
        if (btnDelete) {
            const hasDeletePermission = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin') && !isLocked;
            if (hasDeletePermission) {
                btnDelete.classList.remove('hidden');
                btnDelete.onclick = () => deleteRecord(customerId);
            } else {
                btnDelete.classList.add('hidden');
            }
        }

        const btnEdit = document.getElementById('btnEditFromModal');
        if (btnEdit) {
            if (isLocked) {
                btnEdit.classList.add('hidden');
            } else {
                btnEdit.classList.remove('hidden');
                const hasEditPermission = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
                btnEdit.innerHTML = hasEditPermission ? `<span class="material-symbols-outlined text-[16px]">edit</span> Edit Record` : `<span class="material-symbols-outlined text-[16px]">edit_note</span> Request Edit`;
                btnEdit.onclick = () => editCustomerDirectly(customerId);
            }
        }

        const btnVerify = document.getElementById('btnVerifyFromModal');
        if (btnVerify) {
            const canVerify = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin') && !isLocked;
            if (canVerify) {
                btnVerify.classList.remove('hidden');
                btnVerify.onclick = () => window.openVerifyBillingModal(customerId);
            } else {
                btnVerify.classList.add('hidden');
            }
        }

        const btnReopen = document.getElementById('btnReopenFromModal');
        if (btnReopen) {
            const canReopen = (window.currentUserRole === 'super_admin') && isLocked;
            if (canReopen) {
                btnReopen.classList.remove('hidden');
                btnReopen.onclick = () => window.openReopenBillingModal(customerId);
            } else {
                btnReopen.classList.add('hidden');
            }
        }

        const modal = document.getElementById('customerDetailModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.closeCustomerDetailModal = () => {
        const modal = document.getElementById('customerDetailModal');
        if (modal) modal.classList.add('hidden');
    };

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

    // --- PAYMENT TRACKER LEDGER CODE ---
    const paymentForm = document.getElementById('paymentForm');
    const btnClearForm = document.getElementById('btnClearForm');
    const btnCancelForm = document.getElementById('btnCancelForm');
    const btnScanBarcode = document.getElementById('btnScanBarcode');

    const customerNameInput = document.getElementById('customer_name');
    const mobileInput = document.getElementById('mobile_number');
    const invoiceInput = document.getElementById('invoice_number');
    const itemModelInput = document.getElementById('item_model');
    const imeiInput = document.getElementById('imei_number');
    const salesPersonInput = document.getElementById('sales_person');
    const paymentModeInput = document.getElementById('payment_mode');
    const totalBillInput = document.getElementById('total_bill_amount');
    const amountReceivedInput = document.getElementById('amount_received');
    const pendingAmountInput = document.getElementById('pending_amount');
    const pendingFromInput = document.getElementById('pending_from');
    const pendingPersonInput = document.getElementById('pending_person_name');
    const dueDateInput = document.getElementById('due_date');
    const paymentStatusInput = document.getElementById('payment_status');
    const settlementStatusInput = document.getElementById('settlement_status');
    const remarksInput = document.getElementById('remarks');

    const pendingFromSection = document.getElementById('pendingFromSection');
    const pendingPersonNameSection = document.getElementById('pendingPersonNameSection');
    const dueDateSection = document.getElementById('dueDateSection');

    let allPayments = [];
    let activeTrackerTab = 'all'; // all, customer, employee
    let editMode = false;
    let editPaymentId = null;
    let html5QrCode = null;
    let isScannerRunning = false;

    window.switchTrackerTab = (tab) => {
        activeTrackerTab = tab;
        
        // Sync filters with tab to prevent active filter interference
        const filterPendingFrom = document.getElementById('filterPendingFrom');
        const filterSettlement = document.getElementById('filterSettlement');
        if (tab === 'customer') {
            if (filterPendingFrom) filterPendingFrom.value = 'Customer';
            if (filterSettlement) filterSettlement.value = 'Unsettled';
        } else if (tab === 'employee') {
            if (filterPendingFrom) filterPendingFrom.value = 'Employee / Salesperson';
            if (filterSettlement) filterSettlement.value = 'Unsettled';
        }

        const tabs = {
            'all': { btn: 'tabBtnAll', content: 'tabContentAll' },
            'customer': { btn: 'tabBtnCustomer', content: 'tabContentCustomer' },
            'employee': { btn: 'tabBtnEmployee', content: 'tabContentEmployee' }
        };
        Object.keys(tabs).forEach(t => {
            const btnEl = document.getElementById(tabs[t].btn);
            const contentEl = document.getElementById(tabs[t].content);
            if (btnEl && contentEl) {
                if (t === tab) {
                    btnEl.classList.add('active');
                    contentEl.classList.remove('hidden');
                } else {
                    btnEl.classList.remove('active');
                    contentEl.classList.add('hidden');
                }
            }
        });
        fetchPayments();
    };

    window.filterByEmployeePending = (employeeName) => {
        // Switch to the 'all' payments tab
        window.switchTrackerTab('all');

        // Clear active filters that could block displaying the employee's records
        const filtersToClear = [
            'filterStartDate', 'filterEndDate', 
            'filterStartDatePayments', 'filterEndDatePayments', 
            'filterMode', 'filterStatus', 'filterSalesperson'
        ];
        filtersToClear.forEach(fid => {
            const el = document.getElementById(fid);
            if (el) el.value = '';
        });

        // Set filters to target this employee's pending payments
        const filterPendingFrom = document.getElementById('filterPendingFrom');
        if (filterPendingFrom) {
            filterPendingFrom.value = 'Employee / Salesperson';
        }
        
        const filterSettlement = document.getElementById('filterSettlement');
        if (filterSettlement) {
            filterSettlement.value = 'Unsettled';
        }

        const filterSearch = document.getElementById('filterSearch');
        if (filterSearch) {
            filterSearch.value = employeeName;
        }

        // Fetch payments with the new filters applied
        fetchPayments();
    };

    window.filterAllEmployeePending = () => {
        // Switch to the 'all' payments tab
        window.switchTrackerTab('all');

        // Clear active filters that could block displaying employee records
        const filtersToClear = [
            'filterStartDate', 'filterEndDate', 
            'filterStartDatePayments', 'filterEndDatePayments', 
            'filterMode', 'filterStatus', 'filterSalesperson', 'filterSearch'
        ];
        filtersToClear.forEach(fid => {
            const el = document.getElementById(fid);
            if (el) el.value = '';
        });

        // Set filters to target all employee pending payments
        const filterPendingFrom = document.getElementById('filterPendingFrom');
        if (filterPendingFrom) {
            filterPendingFrom.value = 'Employee / Salesperson';
        }
        
        const filterSettlement = document.getElementById('filterSettlement');
        if (filterSettlement) {
            filterSettlement.value = 'Unsettled';
        }

        // Fetch payments with the new filters applied
        fetchPayments();
    };

    window.openPopupModal = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;

        const searchInput = document.getElementById(`search-${id}`);
        if (searchInput) {
            searchInput.value = '';
            window.filterPopupOptions(id, '');
        }

        const currentVal = document.getElementById(id) ? document.getElementById(id).value : '';
        modal.querySelectorAll('.option-item').forEach(item => {
            let checkIcon = item.querySelector('.selected-check-icon');
            if (item.getAttribute('data-value') === currentVal && currentVal !== '') {
                item.classList.add('selected');
                if (!checkIcon) {
                    checkIcon = document.createElement('span');
                    checkIcon.className = 'selected-check-icon material-symbols-outlined text-primary ml-auto text-[18px]';
                    checkIcon.textContent = 'check_circle';
                    item.appendChild(checkIcon);
                }
            } else {
                item.classList.remove('selected');
                if (checkIcon) checkIcon.remove();
            }
        });

        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(0) scale(1)';

        setTimeout(() => { if (searchInput) searchInput.focus(); }, 50);
    };

    window.closePopupModal = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;
        modal.style.opacity = '0';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(100%) scale(0.95)';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        }, 300);
    };

    window.selectPopupOption = (id, value) => {
        const input = document.getElementById(id);
        if (input) {
            input.value = value;
            input.classList.remove('border-rose-500', 'ring-rose-500');
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        closePopupModal(id);
    };

    window.filterPopupOptions = (id, query) => {
        const list = document.getElementById(`list-${id}`);
        if (!list) return;
        const normalized = query.toLowerCase().trim();
        list.querySelectorAll('.option-item').forEach(btn => {
            const val = btn.getAttribute('data-value').toLowerCase();
            const role = (btn.getAttribute('data-role') || '').toLowerCase();
            btn.style.display = (val.includes(normalized) || role.includes(normalized)) ? 'flex' : 'none';
        });
    };

    // Auto calculations for total bill / amount received
    function runCalculations(keepExistingStatus = false) {
        if (!totalBillInput || !amountReceivedInput || !pendingAmountInput) return;
        const totalVal = parseFloat(totalBillInput.value) || 0;
        const receivedVal = parseFloat(amountReceivedInput.value) || 0;
        const pendingVal = Math.max(0, totalVal - receivedVal);
        pendingAmountInput.value = pendingVal.toFixed(2);

        if (pendingVal <= 0) {
            if (!keepExistingStatus) {
                paymentStatusInput.value = 'Fully Paid';
                settlementStatusInput.value = 'Settled';
            }
            pendingFromInput.value = 'No Pending';
            pendingPersonInput.value = '';
            dueDateInput.value = '';

            pendingFromInput.removeAttribute('required');
            dueDateInput.removeAttribute('required');

            pendingFromSection.classList.add('hidden');
            pendingFromSection.style.display = 'none';
            pendingPersonNameSection.classList.add('hidden');
            pendingPersonNameSection.style.display = 'none';
            dueDateSection.classList.add('hidden');
            dueDateSection.style.display = 'none';
        } else {
            if (!keepExistingStatus) {
                paymentStatusInput.value = receivedVal > 0 ? 'Partially Paid' : 'Pending';
                settlementStatusInput.value = 'Unsettled';
            }
            pendingFromInput.setAttribute('required', 'required');
            dueDateInput.setAttribute('required', 'required');

            pendingFromSection.classList.remove('hidden');
            pendingFromSection.style.display = 'flex';
            dueDateSection.classList.remove('hidden');
            dueDateSection.style.display = 'flex';

            togglePendingFromFields();
        }
    }

    function togglePendingFromFields() {
        const from = pendingFromInput.value;
        if (from === 'Employee / Salesperson') {
            pendingPersonNameSection.classList.remove('hidden');
            pendingPersonNameSection.style.display = 'flex';
            if (pendingPersonInput.value === customerNameInput.value) {
                pendingPersonInput.value = '';
            }
            openPopupModal('pending_person_name');
        } else if (from === 'Customer') {
            pendingPersonNameSection.classList.add('hidden');
            pendingPersonNameSection.style.display = 'none';
            pendingPersonInput.value = customerNameInput.value;
        } else {
            pendingPersonNameSection.classList.add('hidden');
            pendingPersonNameSection.style.display = 'none';
            pendingPersonInput.value = '';
        }
    }

    if (totalBillInput) totalBillInput.addEventListener('input', () => runCalculations(false));
    if (amountReceivedInput) amountReceivedInput.addEventListener('input', () => runCalculations(false));
    if (pendingFromInput) pendingFromInput.addEventListener('change', togglePendingFromFields);
    if (customerNameInput) {
        customerNameInput.addEventListener('input', () => {
            if (pendingFromInput.value === 'Customer') {
                pendingPersonInput.value = customerNameInput.value;
            }
        });
    }

    const resetFormState = () => {
        if (!paymentForm) return;
        paymentForm.reset();
        editMode = false;
        editPaymentId = null;
        document.getElementById('formTitle').innerHTML = '<span class="material-symbols-outlined text-[#EE8133] text-[22px] font-bold">add_shopping_cart</span>Record Sales Payment';
        
        pendingFromSection.classList.add('hidden');
        pendingFromSection.style.display = 'none';
        pendingPersonNameSection.classList.add('hidden');
        pendingPersonNameSection.style.display = 'none';
        dueDateSection.classList.add('hidden');
        dueDateSection.style.display = 'none';

        const inputs = [customerNameInput, mobileInput, itemModelInput, imeiInput, salesPersonInput, paymentModeInput, totalBillInput, amountReceivedInput, pendingFromInput, dueDateInput];
        inputs.forEach(input => { if (input) input.classList.remove('border-rose-500', 'ring-rose-500'); });
    };
    if (btnClearForm) btnClearForm.addEventListener('click', resetFormState);
    if (btnCancelForm) btnCancelForm.addEventListener('click', resetFormState);

    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = [customerNameInput, mobileInput, itemModelInput, imeiInput, salesPersonInput, paymentModeInput, totalBillInput, amountReceivedInput, pendingFromInput, dueDateInput];
            inputs.forEach(input => { if (input) input.classList.remove('border-rose-500', 'ring-rose-500'); });

            let valid = true;
            const cName = customerNameInput.value.trim();
            const mobile = mobileInput.value.trim();
            const imei = imeiInput.value.trim();
            const totalVal = parseFloat(totalBillInput.value) || 0;
            const receivedVal = parseFloat(amountReceivedInput.value) || 0;

            if (!cName || cName.length > 100) { customerNameInput.classList.add('border-rose-500'); valid = false; }
            if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) { mobileInput.classList.add('border-rose-500'); valid = false; }
            // Removed 15-digit numeric constraint on IMEI validation to allow arbitrary barcode/serial scanning
            // if (imei && (imei.length !== 15 || !/^\d+$/.test(imei))) { imeiInput.classList.add('border-rose-500'); valid = false; }
            if (totalVal <= 0) { totalBillInput.classList.add('border-rose-500'); valid = false; }
            if (receivedVal < 0 || receivedVal > totalVal) { amountReceivedInput.classList.add('border-rose-500'); valid = false; }

            const pendingVal = totalVal - receivedVal;
            if (pendingVal > 0) {
                if (!pendingFromInput.value || pendingFromInput.value === 'No Pending') { pendingFromInput.classList.add('border-rose-500'); valid = false; }
                if (!dueDateInput.value) { dueDateInput.classList.add('border-rose-500'); valid = false; }
            }

            if (!valid) {
                showToast('Please correct the highlighted form errors.', 'error');
                return;
            }

            const payload = {
                customer_name: cName,
                mobile_number: mobile,
                invoice_number: invoiceInput.value.trim(),
                item_model: itemModelInput.value.trim(),
                imei_number: imei,
                sales_person: salesPersonInput.value,
                payment_mode: paymentModeInput.value,
                total_bill_amount: totalVal,
                amount_received: receivedVal,
                pending_from: pendingFromInput.value,
                pending_person_name: pendingPersonInput.value.trim(),
                due_date: dueDateInput.value,
                payment_status: paymentStatusInput.value,
                settlement_status: settlementStatusInput.value,
                remarks: remarksInput.value.trim()
            };

            const url = editMode ? `/api/payments/${editPaymentId}` : '/api/payments';
            const method = editMode ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const res = await response.json();
                if (response.ok && res.success) {
                    showToast(editMode ? 'Sales record updated successfully!' : 'Sales payment recorded successfully!', 'success');
                    resetFormState();
                    fetchPayments();
                } else {
                    showToast(res.message || 'Saving failed.', 'error');
                }
            } catch (err) {
                showToast('Server connection failed.', 'error');
            }
        });
    }

    // Barcode scanner implementation via direct native camera
    let barcodeFilePicker = document.getElementById('barcodeFilePicker-records');
    if (!barcodeFilePicker) {
        barcodeFilePicker = document.createElement('input');
        barcodeFilePicker.type = 'file';
        barcodeFilePicker.id = 'barcodeFilePicker-records';
        barcodeFilePicker.accept = 'image/*';
        barcodeFilePicker.className = 'hidden';
        document.body.appendChild(barcodeFilePicker);
    }
    barcodeFilePicker.setAttribute('capture', 'environment');

    let dummyReader = document.getElementById('interactive-reader');
    if (!dummyReader) {
        dummyReader = document.createElement('div');
        dummyReader.id = 'interactive-reader';
        dummyReader.style.display = 'none';
        document.body.appendChild(dummyReader);
    }

    function showBarcodeCroppingModal(file, onCropAndScan, onCancel) {
        const modalId = 'barcode-crop-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
        modal.style.backdropFilter = 'blur(8px)';
        modal.style.webkitBackdropFilter = 'blur(8px)';
        modal.style.zIndex = '99999';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.color = '#fff';
        modal.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        
        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.marginBottom = '20px';
        header.style.padding = '0 20px';
        header.innerHTML = `
            <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700; color: #f97316; letter-spacing: 0.5px;">Align Barcode</h3>
            <p style="margin: 0; font-size: 0.875rem; color: #94a3b8;">Ensure the target barcode is centered inside the orange box</p>
        `;
        modal.appendChild(header);

        const container = document.createElement('div');
        container.style.width = '90%';
        container.style.maxWidth = '500px';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        modal.appendChild(container);

        const imageWrapper = document.createElement('div');
        imageWrapper.style.position = 'relative';
        imageWrapper.style.display = 'inline-block';
        imageWrapper.style.maxWidth = '100%';
        imageWrapper.style.maxHeight = '60vh';
        imageWrapper.style.borderRadius = '12px';
        imageWrapper.style.overflow = 'hidden';
        imageWrapper.style.backgroundColor = '#000';
        imageWrapper.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
        container.appendChild(imageWrapper);
        
        const loader = document.createElement('div');
        loader.style.padding = '40px';
        loader.style.fontSize = '0.9rem';
        loader.style.color = '#94a3b8';
        loader.innerText = 'Loading preview...';
        imageWrapper.appendChild(loader);



        const zoomControl = document.createElement('div');
        zoomControl.style.width = '90%';
        zoomControl.style.maxWidth = '500px';
        zoomControl.style.marginTop = '16px';
        zoomControl.style.display = 'flex';
        zoomControl.style.alignItems = 'center';
        zoomControl.style.gap = '12px';
        
        const zoomLabel = document.createElement('span');
        zoomLabel.style.fontSize = '0.85rem';
        zoomLabel.style.color = '#94a3b8';
        zoomLabel.style.fontWeight = '600';
        zoomLabel.innerText = '🔍 Zoom';
        
        const zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.min = '1';
        zoomSlider.max = '4';
        zoomSlider.step = '0.05';
        zoomSlider.value = '1';
        zoomSlider.style.flex = '1';
        zoomSlider.style.accentColor = '#f97316';
        zoomSlider.style.height = '6px';
        zoomSlider.style.borderRadius = '3px';
        zoomSlider.style.cursor = 'pointer';
        
        const zoomValueText = document.createElement('span');
        zoomValueText.style.fontSize = '0.85rem';
        zoomValueText.style.color = '#f97316';
        zoomValueText.style.fontWeight = '700';
        zoomValueText.style.minWidth = '35px';
        zoomValueText.style.textAlign = 'right';
        zoomValueText.innerText = '1.0x';
        
        zoomControl.appendChild(zoomLabel);
        zoomControl.appendChild(zoomSlider);
        zoomControl.appendChild(zoomValueText);

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '12px';
        controls.style.marginTop = '24px';
        controls.style.width = '90%';
        controls.style.maxWidth = '500px';
        
        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.innerText = 'Cancel';
        btnCancel.style.flex = '1';
        btnCancel.style.padding = '14px 20px';
        btnCancel.style.borderRadius = '12px';
        btnCancel.style.border = '1px solid #334155';
        btnCancel.style.backgroundColor = 'transparent';
        btnCancel.style.color = '#94a3b8';
        btnCancel.style.fontSize = '0.95rem';
        btnCancel.style.fontWeight = '600';
        btnCancel.style.cursor = 'pointer';
        btnCancel.style.transition = 'all 0.2s ease';
        btnCancel.addEventListener('mouseenter', () => { btnCancel.style.backgroundColor = 'rgba(255,255,255,0.05)'; btnCancel.style.color = '#fff'; });
        btnCancel.addEventListener('mouseleave', () => { btnCancel.style.backgroundColor = 'transparent'; btnCancel.style.color = '#94a3b8'; });
        btnCancel.addEventListener('click', () => {
            modal.style.opacity = '0';
            setTimeout(() => { modal.remove(); onCancel(); }, 300);
        });

        const btnScan = document.createElement('button');
        btnScan.type = 'button';
        btnScan.innerText = 'Scan Aligned Area';
        btnScan.style.flex = '2';
        btnScan.style.padding = '14px 20px';
        btnScan.style.borderRadius = '12px';
        btnScan.style.border = 'none';
        btnScan.style.backgroundColor = '#f97316';
        btnScan.style.color = '#fff';
        btnScan.style.fontSize = '0.95rem';
        btnScan.style.fontWeight = '600';
        btnScan.style.cursor = 'pointer';
        btnScan.style.transition = 'all 0.2s ease';
        btnScan.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
        btnScan.addEventListener('mouseenter', () => { btnScan.style.backgroundColor = '#ea580c'; btnScan.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.4)'; });
        btnScan.addEventListener('mouseleave', () => { btnScan.style.backgroundColor = '#f97316'; btnScan.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)'; });

        controls.appendChild(btnCancel);
        controls.appendChild(btnScan);
        
        modal.appendChild(zoomControl);
        modal.appendChild(controls);

        document.body.appendChild(modal);
        
        requestAnimationFrame(() => modal.style.opacity = '1');

        const img = new Image();
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        img.onload = function() {
            loader.remove();
            
            img.style.display = 'block';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '60vh';
            img.style.width = 'auto';
            img.style.height = 'auto';
            imageWrapper.appendChild(img);

            const wrapperWidth = img.offsetWidth;
            const wrapperHeight = img.offsetHeight;
            imageWrapper.style.width = wrapperWidth + 'px';
            imageWrapper.style.height = wrapperHeight + 'px';

            let isDragging = false;
            let startY = 0;
            let startTopPercent = 35;
            const cropHeightPercent = 30;
            let currentTopPercent = 35;

            let scale = 1.0;
            let panX = 0;
            let panY = 0;
            let isPanning = false;
            let panStartX = 0;
            let panStartY = 0;
            let startPanX = 0;
            let startPanY = 0;

            img.style.transformOrigin = 'center center';
            img.style.transition = 'none';

            zoomSlider.addEventListener('input', (e) => {
                scale = parseFloat(e.target.value);
                zoomValueText.innerText = scale.toFixed(1) + 'x';
                img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            });

            const topShade = document.createElement('div');
            topShade.style.position = 'absolute';
            topShade.style.top = '0';
            topShade.style.left = '0';
            topShade.style.width = '100%';
            topShade.style.height = '35%';
            topShade.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
            topShade.style.pointerEvents = 'none';
            
            const bottomShade = document.createElement('div');
            bottomShade.style.position = 'absolute';
            bottomShade.style.bottom = '0';
            bottomShade.style.left = '0';
            bottomShade.style.width = '100%';
            bottomShade.style.height = '35%';
            bottomShade.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
            bottomShade.style.pointerEvents = 'none';
            
            const alignmentTarget = document.createElement('div');
            alignmentTarget.style.position = 'absolute';
            alignmentTarget.style.top = '35%';
            alignmentTarget.style.left = '0';
            alignmentTarget.style.width = '100%';
            alignmentTarget.style.height = '30%';
            alignmentTarget.style.borderTop = '2px solid #f97316';
            alignmentTarget.style.borderBottom = '2px solid #f97316';
            alignmentTarget.style.boxSizing = 'border-box';
            alignmentTarget.style.pointerEvents = 'auto';
            alignmentTarget.style.cursor = 'ns-resize';
            alignmentTarget.style.touchAction = 'none';
            alignmentTarget.style.boxShadow = 'inset 0 0 10px rgba(249, 115, 22, 0.1)';

            const dragTip = document.createElement('div');
            dragTip.innerText = '↕ Drag Box to Align Barcode ↕';
            dragTip.style.position = 'absolute';
            dragTip.style.top = '50%';
            dragTip.style.left = '50%';
            dragTip.style.transform = 'translate(-50%, -50%)';
            dragTip.style.fontSize = '12px';
            dragTip.style.color = 'rgba(249, 115, 22, 0.9)';
            dragTip.style.textTransform = 'uppercase';
            dragTip.style.letterSpacing = '1px';
            dragTip.style.fontWeight = 'bold';
            dragTip.style.pointerEvents = 'none';
            dragTip.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
            alignmentTarget.appendChild(dragTip);

            const laser = document.createElement('div');
            laser.style.position = 'absolute';
            laser.style.top = '50%';
            laser.style.left = '5%';
            laser.style.width = '90%';
            laser.style.height = '2px';
            laser.style.backgroundColor = '#ef4444';
            laser.style.boxShadow = '0 0 8px #ef4444';
            laser.style.pointerEvents = 'none';
            laser.style.animation = 'laserMove 2s infinite ease-in-out';
            alignmentTarget.appendChild(laser);
            
            const styleId = 'laser-animation-style';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    @keyframes laserMove {
                        0% { top: 10%; }
                        50% { top: 90%; }
                        100% { top: 10%; }
                    }
                `;
                document.head.appendChild(style);
            }

            imageWrapper.appendChild(topShade);
            imageWrapper.appendChild(bottomShade);
            imageWrapper.appendChild(alignmentTarget);

            const getEventXAndY = (ev) => {
                if (ev.touches && ev.touches.length > 0) {
                    return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                }
                return { x: ev.clientX, y: ev.clientY };
            };

            const startDrag = (e) => {
                isDragging = true;
                startY = getEventXAndY(e).y;
                startTopPercent = currentTopPercent;
                alignmentTarget.style.borderTopColor = '#38bdf8';
                alignmentTarget.style.borderBottomColor = '#38bdf8';
                dragTip.style.color = '#38bdf8';
                dragTip.innerText = '↕ Aligning... ↕';
                e.preventDefault();
            };

            const doDrag = (e) => {
                if (!isDragging) return;
                const currentY = getEventXAndY(e).y;
                const diffY = currentY - startY;
                if (wrapperHeight > 0) {
                    const diffPercent = (diffY / wrapperHeight) * 100;
                    let newTop = startTopPercent + diffPercent;
                    newTop = Math.max(0, Math.min(100 - cropHeightPercent, newTop));
                    currentTopPercent = newTop;
                    
                    topShade.style.height = currentTopPercent + '%';
                    alignmentTarget.style.top = currentTopPercent + '%';
                    bottomShade.style.height = (100 - currentTopPercent - cropHeightPercent) + '%';
                }
                e.preventDefault();
            };

            const stopDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                alignmentTarget.style.borderTopColor = '#f97316';
                alignmentTarget.style.borderBottomColor = '#f97316';
                dragTip.style.color = 'rgba(249, 115, 22, 0.9)';
                dragTip.innerText = '↕ Drag Box to Align Barcode ↕';
            };

            alignmentTarget.addEventListener('mousedown', startDrag);
            window.addEventListener('mousemove', doDrag);
            window.addEventListener('mouseup', stopDrag);

            alignmentTarget.addEventListener('touchstart', startDrag, { passive: false });
            window.addEventListener('touchmove', doDrag, { passive: false });
            window.addEventListener('touchend', stopDrag);

            const startImagePan = (e) => {
                if (e.target === alignmentTarget || alignmentTarget.contains(e.target)) return;
                
                isPanning = true;
                const coords = getEventXAndY(e);
                panStartX = coords.x;
                panStartY = coords.y;
                startPanX = panX;
                startPanY = panY;
                imageWrapper.style.cursor = 'grabbing';
                e.preventDefault();
            };

            const doImagePan = (e) => {
                if (!isPanning) return;
                const coords = getEventXAndY(e);
                const diffX = coords.x - panStartX;
                const diffY = coords.y - panStartY;
                
                panX = startPanX + diffX;
                panY = startPanY + diffY;
                
                img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
                e.preventDefault();
            };

            const stopImagePan = () => {
                if (!isPanning) return;
                isPanning = false;
                imageWrapper.style.cursor = 'default';
            };

            imageWrapper.addEventListener('mousedown', startImagePan);
            window.addEventListener('mousemove', doImagePan);
            window.addEventListener('mouseup', stopImagePan);

            imageWrapper.addEventListener('touchstart', startImagePan, { passive: false });
            window.addEventListener('touchmove', doImagePan, { passive: false });
            window.addEventListener('touchend', stopImagePan);
            
            btnScan.addEventListener('click', () => {
                btnScan.disabled = true;
                btnScan.innerText = 'Processing...';
                btnScan.style.backgroundColor = '#d97706';
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const cx = wrapperWidth / 2;
                const cy = wrapperHeight / 2;
                
                const y_v_start = (currentTopPercent / 100) * wrapperHeight;
                const y_v_end = ((currentTopPercent + cropHeightPercent) / 100) * wrapperHeight;
                
                const x_i_start = cx + (0 - cx - panX) / scale;
                const x_i_end = cx + (wrapperWidth - cx - panX) / scale;
                
                const y_i_start = cy + (y_v_start - cy - panY) / scale;
                const y_i_end = cy + (y_v_end - cy - panY) / scale;
                
                let sX = x_i_start * (img.naturalWidth / wrapperWidth);
                let sY = y_i_start * (img.naturalHeight / wrapperHeight);
                let sWidth = (x_i_end - x_i_start) * (img.naturalWidth / wrapperWidth);
                let sHeight = (y_i_end - y_i_start) * (img.naturalHeight / wrapperHeight);
                
                sX = Math.max(0, Math.min(img.naturalWidth, sX));
                sY = Math.max(0, Math.min(img.naturalHeight, sY));
                sWidth = Math.max(1, Math.min(img.naturalWidth - sX, sWidth));
                sHeight = Math.max(1, Math.min(img.naturalHeight - sY, sHeight));
                
                canvas.width = sWidth;
                canvas.height = sHeight;
                
                ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const croppedFile = new File([blob], "cropped_barcode.png", { type: "image/png" });
                        onCropAndScan(croppedFile, () => {
                            modal.style.opacity = '0';
                            setTimeout(() => modal.remove(), 300);
                        }, () => {
                            btnScan.disabled = false;
                            btnScan.innerText = 'Scan Aligned Area';
                            btnScan.style.backgroundColor = '#f97316';
                        });
                    } else {
                        btnScan.disabled = false;
                        btnScan.innerText = 'Scan Aligned Area';
                        btnScan.style.backgroundColor = '#f97316';
                        alert("Error processing photo canvas.");
                    }
                }, "image/png");
            });
        };
    }

    if (barcodeFilePicker) {
        barcodeFilePicker.addEventListener('change', async (e) => {
            const file = e.target.files[0]; if (!file) return;
            showToast('Preparing preview...', 'success');
            
            showBarcodeCroppingModal(file, async (croppedFile, onSuccess, onError) => {
                showToast('Scanning aligned area...', 'success');
                if (!html5QrCode) html5QrCode = new Html5Qrcode('interactive-reader');
                try {
                    const decodedText = await html5QrCode.scanFile(croppedFile, true);
                    const trimmed = decodedText.trim();
                    
                    const res = await fetch('/api/verify-imei', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imei: trimmed })
                    });
                    const verification = await res.json();
                    if (res.ok && verification.success) {
                        if (imeiInput) {
                            imeiInput.value = trimmed;
                            imeiInput.classList.remove('border-rose-500');
                            imeiInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        showToast('IMEI verified successfully: ' + trimmed, 'success');
                        onSuccess();
                    } else {
                        showToast(verification.message || 'Scanned IMEI is invalid.', 'error');
                        onError();
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Could not decode a barcode from the aligned region. Please align and try again.', 'error');
                    onError();
                }
            }, () => {
                showToast('Scanning cancelled.', 'info');
            });

            barcodeFilePicker.value = '';
        });
    }

    if (btnScanBarcode) {
        btnScanBarcode.addEventListener('click', () => {
            if (barcodeFilePicker) barcodeFilePicker.click();
        });
    }

    // Fetch payments from server
    async function fetchPayments() {
        const start = document.getElementById('filterStartDatePayments') ? document.getElementById('filterStartDatePayments').value : '';
        const end = document.getElementById('filterEndDatePayments') ? document.getElementById('filterEndDatePayments').value : '';
        const mode = document.getElementById('filterMode') ? document.getElementById('filterMode').value : '';
        const status = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';
        const settlement = document.getElementById('filterSettlement') ? document.getElementById('filterSettlement').value : '';
        const pendingFrom = document.getElementById('filterPendingFrom') ? document.getElementById('filterPendingFrom').value : '';
        const salesperson = document.getElementById('filterSalesperson') ? document.getElementById('filterSalesperson').value : '';
        const search = document.getElementById('filterSearch') ? document.getElementById('filterSearch').value : '';

        let params = new URLSearchParams();
        if (start) params.append('start_date', start);
        if (end) params.append('end_date', end);
        if (mode) params.append('payment_mode', mode);
        if (status) params.append('payment_status', status);
        if (settlement) params.append('settlement_status', settlement);
        if (pendingFrom) params.append('pending_from', pendingFrom);
        if (salesperson) params.append('sales_person', salesperson);
        if (search) params.append('search', search);

        try {
            const summaryRes = await fetch('/api/payment-summary');
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                if (summaryData.success && summaryData.summary) {
                    updateSummaryCards(summaryData.summary);
                }
            }
            const response = await fetch(`/api/payments?${params.toString()}`);
            if (!response.ok) return;
            const res = await response.json();
            if (res.success) {
                allPayments = res.data || [];
                renderAllTables();
            }
        } catch (err) {
            console.error('Fetch payments error:', err);
        }
    }

    function updateSummaryCards(s) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setVal('cardCustomerPending', `₹${Math.round(s.customer_pending).toLocaleString()}`);
        setVal('cardEmployeePending', `₹${Math.round(s.employee_pending).toLocaleString()}`);
    }

    function renderAllTables() {
        if (activeTrackerTab === 'all') {
            renderMainTable();
        } else if (activeTrackerTab === 'customer') {
            renderCustomerDebtTable();
        } else if (activeTrackerTab === 'employee') {
            renderEmployeeDebtTable();
        }
    }

    function renderMainTable() {
        const body = document.getElementById('paymentTableBody');
        const cardsContainer = document.getElementById('paymentMobileCards');
        if (!body || !cardsContainer) return;
        body.innerHTML = '';
        cardsContainer.innerHTML = '';

        if (allPayments.length === 0) {
            body.innerHTML = `<tr><td colspan="8" class="px-6 py-10 text-center text-slate-400 font-medium bg-slate-50/50">No payment records found matching active filters.</td></tr>`;
            cardsContainer.innerHTML = `<div class="p-6 text-center text-slate-400 bg-slate-50 border border-[#E5E7EB] rounded-2xl">No records matching active filters.</div>`;
            return;
        }

        allPayments.forEach(p => {
            const total = parseFloat(p.total_bill_amount) || 0;
            const received = parseFloat(p.amount_received) || 0;
            const pending = parseFloat(p.pending_amount) || 0;
            const dateStr = p.created_at ? p.created_at.split(' ')[0] : '--';
            
            let statusTag = '';
            if (p.payment_status === 'Fully Paid') {
                statusTag = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">Paid</span>`;
            } else if (p.payment_status === 'Partially Paid') {
                statusTag = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-amber-700 border border-yellow-200">Partial</span>`;
            } else {
                statusTag = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Pending</span>`;
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 border-b border-slate-100 transition-colors';
            tr.innerHTML = `
                <td class="px-4 py-3 font-bold text-[#0D70C0] cursor-pointer hover:underline" onclick="viewPaymentDetail('${p.payment_id}')">${escapeHtml(p.customer_name)}</td>
                <td class="px-4 py-3 font-data-mono">${escapeHtml(p.mobile_number)}</td>
                <td class="px-4 py-3 font-data-mono">${escapeHtml(p.invoice_number || '--')}</td>
                <td class="px-4 py-3 text-right text-emerald-600 font-bold">₹${received.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3 text-right text-rose-600 font-bold">₹${pending.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3">${escapeHtml(p.pending_from)}</td>
                <td class="px-4 py-3">${statusTag}</td>
                <td class="px-4 py-3 text-right whitespace-nowrap flex items-center justify-end gap-1.5 min-h-[48px]">
                    <button onclick="viewPaymentDetail('${p.payment_id}')" class="p-1.5 text-slate-500 hover:text-primary transition-colors flex items-center justify-center rounded hover:bg-slate-100" title="View Logs"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
                    <button onclick="editPaymentDetail('${p.payment_id}')" class="p-1.5 text-slate-500 hover:text-amber-600 transition-colors flex items-center justify-center rounded hover:bg-slate-100" title="Edit"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                    ${pending > 0 ? `
                        <button onclick="openPartialPaymentModal('${p.payment_id}')" class="p-1.5 text-slate-500 hover:text-emerald-600 transition-colors flex items-center justify-center rounded hover:bg-slate-100" title="Add Partial"><span class="material-symbols-outlined text-[18px]">add_card</span></button>
                        <button onclick="markAsFullyPaid('${p.payment_id}')" class="p-1.5 text-slate-500 hover:text-green-600 transition-colors flex items-center justify-center rounded hover:bg-slate-100" title="Mark Paid"><span class="material-symbols-outlined text-[18px]">check_circle</span></button>
                    ` : ''}
                    <button onclick="deletePaymentDetail('${p.payment_id}')" class="p-1.5 text-slate-500 hover:text-rose-600 transition-colors flex items-center justify-center rounded hover:bg-slate-100" title="Delete"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                </td>
            `;
            body.appendChild(tr);

            const card = document.createElement('div');
            card.className = 'bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3';
            card.innerHTML = `
                <div class="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span class="text-xs font-bold text-slate-500 font-data-mono">${p.payment_id}</span>
                    <span class="text-xs text-slate-400">${dateStr}</span>
                </div>
                <div class="flex flex-col gap-1.5 text-xs">
                    <div class="flex justify-between gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Customer:</span><span class="font-bold text-[#0D70C0] text-right break-words max-w-[65%]">${escapeHtml(p.customer_name)}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Mobile:</span><span class="font-data-mono text-right break-words">${escapeHtml(p.mobile_number)}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Invoice:</span><span class="font-data-mono text-right break-all max-w-[65%]">${escapeHtml(p.invoice_number || '--')}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Collected:</span><span class="font-bold text-emerald-600 text-right">₹${received.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Pending:</span><span class="font-bold text-rose-600 text-right">₹${pending.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div class="flex justify-between items-center gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Status:</span><span class="text-right">${statusTag}</span></div>
                </div>
                <div class="flex flex-wrap items-center justify-start sm:justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                    <button onclick="viewPaymentDetail('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">visibility</span> Details</button>
                    <button onclick="editPaymentDetail('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-amber-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">edit</span> Edit</button>
                    ${pending > 0 ? `
                        <button onclick="openPartialPaymentModal('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">add_card</span> Partial</button>
                        <button onclick="markAsFullyPaid('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-green-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">check_circle</span> Settle</button>
                    ` : ''}
                    <button onclick="deletePaymentDetail('${p.payment_id}')" class="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                </div>
            `;
            cardsContainer.appendChild(card);
        });
    }

    function renderCustomerDebtTable() {
        const body = document.getElementById('customerDebtTableBody');
        if (!body) return;
        body.innerHTML = '';
        const customerDebts = allPayments.filter(p => p.pending_from === 'Customer' && p.settlement_status === 'Unsettled');
        if (customerDebts.length === 0) {
            body.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400 font-medium bg-slate-50/50">No customer debts found.</td></tr>`;
            return;
        }
        customerDebts.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 border-b border-slate-100 transition-colors';
            tr.innerHTML = `
                <td class="px-4 py-3.5 font-bold text-[#0D70C0]">${escapeHtml(p.customer_name)}</td>
                <td class="px-4 py-3.5 font-data-mono text-slate-600">${escapeHtml(p.mobile_number)}</td>
                <td class="px-4 py-3.5 text-right font-bold text-rose-600">₹${(parseFloat(p.pending_amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3.5 font-bold text-slate-800">${p.due_date}</td>
                <td class="px-4 py-3.5 text-slate-500 max-w-[200px] truncate" title="${escapeHtml(p.remarks)}">${escapeHtml(p.remarks || 'No notes.')}</td>
                <td class="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                    <button onclick="openPartialPaymentModal('${p.payment_id}')" class="px-3 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">add_card</span> Partial</button>
                    <button onclick="markAsFullyPaid('${p.payment_id}')" class="px-3 py-1.5 border border-green-200 text-green-700 bg-green-50/50 hover:bg-green-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">check_circle</span> Settle</button>
                </td>
            `;
            body.appendChild(tr);
        });
    }

    function renderEmployeeDebtTable() {
        const body = document.getElementById('employeeDebtTableBody');
        if (!body) return;
        body.innerHTML = '';
        const employeeDebts = allPayments.filter(p => p.pending_from === 'Employee / Salesperson' && p.settlement_status === 'Unsettled');
        if (employeeDebts.length === 0) {
            body.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400 font-medium bg-slate-50/50">No employee pending amounts found.</td></tr>`;
            return;
        }

        const aggregated = {};
        employeeDebts.forEach(p => {
            const name = p.pending_person_name || p.sales_person;
            if (!aggregated[name]) {
                aggregated[name] = { name: name, cases: 0, totalPending: 0.0, oldestDue: '9999-12-31' };
            }
            aggregated[name].cases++;
            aggregated[name].totalPending += parseFloat(p.pending_amount) || 0;
            if (p.due_date && p.due_date < aggregated[name].oldestDue) { aggregated[name].oldestDue = p.due_date; }
        });

        Object.values(aggregated).forEach(emp => {
            const tr = document.createElement('tr');
            tr.className = 'cursor-pointer hover:bg-slate-100 border-b border-slate-100 transition-colors';
            const d = new Date();
            const todayStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
            const isOverdue = emp.oldestDue < todayStr;
            const dueBadge = isOverdue 
                ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Overdue</span>`
                : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Active</span>`;

            tr.onclick = () => window.filterByEmployeePending(emp.name);

            tr.innerHTML = `
                <td class="px-4 py-3.5 font-bold text-slate-800">${escapeHtml(emp.name)}</td>
                <td class="px-4 py-3.5 text-center font-bold">${emp.cases} cases</td>
                <td class="px-4 py-3.5 text-right font-bold text-rose-600">₹${emp.totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3.5 font-bold text-slate-800 font-data-mono">${emp.oldestDue === '9999-12-31' ? '--' : emp.oldestDue}</td>
                <td class="px-4 py-3.5">${dueBadge}</td>
                <td class="px-4 py-3.5 text-right">
                    <button class="px-3 py-1.5 border border-primary text-primary bg-primary/5 hover:bg-primary/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto">
                        <span class="material-symbols-outlined text-[16px]">visibility</span> View Details
                    </button>
                </td>
            `;
            body.appendChild(tr);
        });
    }

    // View Details Modal
    window.viewPaymentDetail = async (id) => {
        const modal = document.getElementById('modal-payment-detail');
        if (!modal) return;
        const payment = allPayments.find(p => p.payment_id === id);
        if (!payment) return;

        document.getElementById('detPaymentId').textContent = payment.payment_id;
        document.getElementById('detDate').textContent = payment.created_at || '--';
        document.getElementById('detCustomerName').textContent = payment.customer_name;
        document.getElementById('detMobile').textContent = payment.mobile_number;
        document.getElementById('detModel').innerHTML = `<strong>Model:</strong> ${escapeHtml(payment.item_model)}<br><strong>IMEI:</strong> <span class="font-data-mono">${escapeHtml(payment.imei_number)}</span>`;
        document.getElementById('detSalesPerson').textContent = payment.sales_person;
        document.getElementById('detInvoice').textContent = payment.invoice_number || '--';
        document.getElementById('detPaymentMode').textContent = payment.payment_mode;
        document.getElementById('detTotalBill').textContent = `₹${(parseFloat(payment.total_bill_amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('detReceived').textContent = `₹${(parseFloat(payment.amount_received) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('detPending').textContent = `₹${(parseFloat(payment.pending_amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        
        const debtSec = document.getElementById('detDebtSection');
        if (parseFloat(payment.pending_amount) > 0) {
            debtSec.classList.remove('hidden');
            document.getElementById('detDebtInfo').innerHTML = `<strong>From:</strong> ${payment.pending_from}<br><strong>Name:</strong> ${escapeHtml(payment.pending_person_name || 'Customer')}<br><strong>Due:</strong> ${payment.due_date}`;
        } else {
            debtSec.classList.add('hidden');
        }

        document.getElementById('detStatuses').innerHTML = `<strong>Payment:</strong> ${payment.payment_status}<br><strong>Settlement:</strong> ${payment.settlement_status}`;
        document.getElementById('detRemarks').textContent = payment.remarks || 'No notes.';

        const historyList = document.getElementById('detHistoryList');
        historyList.innerHTML = '';
        if (payment.payment_history && payment.payment_history.length > 0) {
            payment.payment_history.forEach(log => {
                const item = document.createElement('div');
                item.className = 'history-timeline-item flex flex-col gap-0.5 text-[11px]';
                item.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-emerald-600">+ ₹${(parseFloat(log.amount_added) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        <span class="text-slate-400 font-data-mono text-[9px]">${log.date_time}</span>
                    </div>
                    <div class="text-slate-500"><span class="font-semibold text-slate-700">Received By:</span> ${escapeHtml(log.received_by)}</div>
                    <div class="text-slate-500 italic">"${escapeHtml(log.remarks || 'No remarks provided')}"</div>
                `;
                historyList.appendChild(item);
            });
        } else {
            historyList.innerHTML = `<p class="text-slate-400 italic text-[11px]">No payment history available.</p>`;
        }

        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.style.opacity = '1';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(0) scale(1)';
    };

    window.closeDetailModal = () => {
        const modal = document.getElementById('modal-payment-detail');
        if (!modal) return;
        modal.style.opacity = '0';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(100%) scale(0.95)';
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    // Edit payment record
    window.editPaymentDetail = (id) => {
        const payment = allPayments.find(p => p.payment_id === id);
        if (!payment) return;

        editMode = true;
        editPaymentId = payment.payment_id;
        document.getElementById('edit_payment_id').value = payment.payment_id;
        document.getElementById('formTitle').innerHTML = `<span class="material-symbols-outlined text-[#EE8133] text-[22px] font-bold">edit</span>Edit Payment: ${payment.payment_id}`;

        customerNameInput.value = payment.customer_name;
        mobileInput.value = payment.mobile_number;
        invoiceInput.value = payment.invoice_number || '';
        itemModelInput.value = payment.item_model;
        imeiInput.value = payment.imei_number;
        salesPersonInput.value = payment.sales_person;
        paymentModeInput.value = payment.payment_mode;
        totalBillInput.value = payment.total_bill_amount;
        amountReceivedInput.value = payment.amount_received;
        pendingAmountInput.value = payment.pending_amount;
        pendingFromInput.value = payment.pending_from || 'No Pending';
        pendingPersonInput.value = payment.pending_person_name || '';
        dueDateInput.value = payment.due_date || '';
        paymentStatusInput.value = payment.payment_status;
        settlementStatusInput.value = payment.settlement_status;
        remarksInput.value = payment.remarks || '';

        runCalculations(true);
        document.getElementById('view-payment-form-section').scrollIntoView({ behavior: 'smooth' });
        showToast(`Loaded ${payment.payment_id} details for editing.`, 'success');
    };

    // Record partial payment
    window.openPartialPaymentModal = (id) => {
        const payment = allPayments.find(p => p.payment_id === id);
        if (!payment) return;

        const modal = document.getElementById('modal-partial-payment');
        if (!modal) return;

        document.getElementById('partial_payment_id').value = payment.payment_id;
        document.getElementById('partialPendingBalance').textContent = `₹${(parseFloat(payment.pending_amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('partial_amount_added').value = '';
        document.getElementById('partial_amount_added').max = payment.pending_amount;
        document.getElementById('partial_remarks').value = '';

        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.style.opacity = '1';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(0) scale(1)';
    };

    window.closePartialModal = () => {
        const modal = document.getElementById('modal-partial-payment');
        if (!modal) return;
        modal.style.opacity = '0';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(100%) scale(0.95)';
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    const partialForm = document.getElementById('partialPaymentForm');
    if (partialForm) {
        partialForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('partial_payment_id').value;
            const amount = parseFloat(document.getElementById('partial_amount_added').value) || 0;
            const remarks = document.getElementById('partial_remarks').value.trim();

            if (amount <= 0) {
                showToast('Please enter a valid partial payment amount.', 'error');
                return;
            }

            try {
                const response = await fetch(`/api/payments/${id}/partial-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount_added: amount, remarks: remarks })
                });
                const res = await response.json();
                if (response.ok && res.success) {
                    showToast(`Recorded partial payment of ₹${amount.toLocaleString()} successfully!`, 'success');
                    closePartialModal();
                    fetchPayments();
                } else {
                    showToast(res.message || 'Partial update failed.', 'error');
                }
            } catch (err) {
                showToast('Server update failed.', 'error');
            }
        });
    }

    // Settle fully paid
    window.markAsFullyPaid = async (id) => {
        const payment = allPayments.find(p => p.payment_id === id);
        if (!payment) return;

        const confirmVal = await window.showConfirm(`Are you sure you want to mark payment ID ${payment.payment_id} for ${payment.customer_name} as Fully Paid? This will settle the remaining balance of ₹${(parseFloat(payment.pending_amount) || 0).toLocaleString()}.`, 'confirm');
        if (!confirmVal) return;

        window.showLoading('Settle pending balance...');
        try {
            const response = await fetch(`/api/payments/${id}/mark-paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const res = await response.json();
            if (response.ok && res.success) {
                showToast('Settle complete: marked record as fully paid.', 'success');
                fetchPayments();
            } else {
                showToast(res.message || 'Settling failed.', 'error');
            }
        } catch (err) {
            showToast('Server update failed.', 'error');
        } finally {
            window.hideLoading();
        }
    };

    // Delete payment record
    window.deletePaymentDetail = async (id) => {
        const confirmVal = await window.showConfirm(`Are you sure you want to delete payment record ${id}? This action is permanent.`, 'error');
        if (!confirmVal) return;

        window.showLoading('Deleting payment record...');
        try {
            const response = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
            const res = await response.json();
            if (response.ok && res.success) {
                showToast('Payment record deleted successfully.', 'success');
                fetchPayments();
            } else {
                showToast(res.message || 'Deletion failed.', 'error');
            }
        } catch (err) {
            showToast('Server deletion failed.', 'error');
        } finally {
            window.hideLoading();
        }
    };

    // Event listeners for filters
    const paymentFilters = ['filterStartDatePayments', 'filterEndDatePayments', 'filterMode', 'filterStatus', 'filterSettlement', 'filterPendingFrom', 'filterSalesperson'];
    paymentFilters.forEach(fid => {
        const el = document.getElementById(fid);
        if (el) el.addEventListener('change', fetchPayments);
    });

    const searchInput = document.getElementById('filterSearch');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchPayments, 350);
        });
    }

    const btnClearDatePayments = document.getElementById('btnClearDateFiltersPayments');
    if (btnClearDatePayments) {
        btnClearDatePayments.addEventListener('click', () => {
            document.getElementById('filterStartDatePayments').value = '';
            document.getElementById('filterEndDatePayments').value = '';
            fetchPayments();
        });
    }

    // Modal Escape Listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const verifyModal = document.getElementById('verifyBillingModal');
            if (verifyModal && !verifyModal.classList.contains('hidden')) {
                window.closeVerifyBillingModal();
                return;
            }
            const reopenModal = document.getElementById('reopenBillingModal');
            if (reopenModal && !reopenModal.classList.contains('hidden')) {
                window.closeReopenBillingModal();
                return;
            }
            const detailModal = document.getElementById('customerDetailModal');
            if (detailModal && !detailModal.classList.contains('hidden')) {
                window.closeCustomerDetailModal();
                return;
            }
            document.querySelectorAll('.popup-modal-overlay:not(.hidden)').forEach(modal => {
                const id = modal.id.replace('modal-', '');
                if (id === 'barcode') { closeBarcodeScanner(); }
                else if (id === 'payment-detail') { closeDetailModal(); }
                else if (id === 'partial-payment') { closePartialModal(); }
                else { closePopupModal(id); }
            });
        }
    });

    // --- LOAD DYNAMIC STAFF LISTS ---
    const loadStaffListForModals = async () => {
        try {
            const res = await fetch('/api/sales-persons');
            if (!res.ok) throw new Error('Failed to load sales persons');
            const staffList = await res.json();
            
            // Populate list-sales_person
            const salesPersonListEl = document.getElementById('list-sales_person');
            if (salesPersonListEl) {
                salesPersonListEl.innerHTML = staffList.map(u => {
                    const display = u.display_name || u.username || '';
                    const initials = display.split(/[\s\-\u2014]+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0].toUpperCase()).join('').slice(0, 2) || '??';
                    const safe = display.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `<button type="button" class="option-item flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 transition-all text-left group" data-value="${safe}" data-role="${u.role || ''}" onclick="selectPopupOption('sales_person', '${safe}')">
                        <span class="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold font-data-mono">${initials}</span>
                        <span class="text-sm font-semibold text-slate-700">${display}</span>
                    </button>`;
                }).join('');
            }

            // Populate filterSalesperson select
            const filterSalespersonSelect = document.getElementById('filterSalesperson');
            if (filterSalespersonSelect) {
                filterSalespersonSelect.innerHTML = '<option value="">All Salespersons</option>' + staffList.map(u => {
                    const display = u.display_name || u.username || '';
                    return `<option value="${display}">${display}</option>`;
                }).join('');
            }
        } catch (e) {
            console.error('Failed to load staff list:', e);
        }
    };

    window.exportCustomerData = async (format) => {
        if (window.currentUserRole !== 'super_admin') {
            window.showToast('Access denied: Export is only available for Super Admins.', 'error');
            return;
        }

        const scope = (currentLedgerFilter || 'TODAY').toLowerCase();
        const search = (document.getElementById('ledgerSearch')?.value || '').trim();
        const from_date = document.getElementById('filterStartDateCustomers')?.value || '';
        const to_date = document.getElementById('filterEndDateCustomers')?.value || '';

        const params = new URLSearchParams({
            scope: scope,
            search: search,
            from_date: from_date,
            to_date: to_date
        });

        const url = `/api/export/customers/${format}?${params.toString()}`;

        window.showLoading(`Generating ${format.toUpperCase()} export...`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                let errMsg = 'Export failed.';
                try {
                    const errJson = await response.json();
                    errMsg = errJson.message || errMsg;
                } catch(e) {}
                throw new Error(errMsg);
            }

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `customers_${scope}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^";]+)"?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
            
            window.showToast(`${format.toUpperCase()} export downloaded successfully.`, 'success');
        } catch (err) {
            console.error('Export error:', err);
            window.showToast(err.message || 'Connection error during export.', 'error');
        } finally {
            window.hideLoading();
        }
    };

    let activeVerificationCustomerId = null;
    let activeReopenCustomerId = null;

    window.openVerifyBillingModal = (customerId) => {
        activeVerificationCustomerId = customerId;
        const remarksInput = document.getElementById('verify_remarks');
        if (remarksInput) remarksInput.value = '';
        const modal = document.getElementById('verifyBillingModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.closeVerifyBillingModal = () => {
        const modal = document.getElementById('verifyBillingModal');
        if (modal) modal.classList.add('hidden');
        activeVerificationCustomerId = null;
    };

    window.openReopenBillingModal = (customerId) => {
        activeReopenCustomerId = customerId;
        const reasonInput = document.getElementById('reopen_reason');
        if (reasonInput) reasonInput.value = '';
        const modal = document.getElementById('reopenBillingModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.closeReopenBillingModal = () => {
        const modal = document.getElementById('reopenBillingModal');
        if (modal) modal.classList.add('hidden');
        activeReopenCustomerId = null;
    };

    window.verifyBilling = async () => {
        if (!activeVerificationCustomerId) return;
        const remarksInput = document.getElementById('verify_remarks');
        const admin_remarks = remarksInput ? remarksInput.value.trim() : '';

        window.showLoading('Verifying billing and locking record...');
        try {
            const response = await fetch(`/api/customers/${activeVerificationCustomerId}/verify-billing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_remarks })
            });
            const res = await response.json();
            if (response.ok && res.success) {
                window.showToast('Billing verified and record locked successfully.', 'success');
                window.closeVerifyBillingModal();
                window.closeCustomerDetailModal();
                loadCustomers();
            } else {
                window.showToast(res.message || 'Failed to verify billing.', 'error');
            }
        } catch (err) {
            window.showToast('Network error during billing verification.', 'error');
        } finally {
            window.hideLoading();
        }
    };

    window.reopenBilling = async () => {
        if (!activeReopenCustomerId) return;
        const reasonInput = document.getElementById('reopen_reason');
        const reopen_reason = reasonInput ? reasonInput.value.trim() : '';

        if (!reopen_reason) {
            window.showToast('A reason for reopening is required.', 'error');
            return;
        }

        window.showLoading('Reopening billing record...');
        try {
            const response = await fetch(`/api/customers/${activeReopenCustomerId}/reopen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reopen_reason })
            });
            const res = await response.json();
            if (response.ok && res.success) {
                window.showToast('Billing record reopened successfully.', 'success');
                window.closeReopenBillingModal();
                window.closeCustomerDetailModal();
                loadCustomers();
            } else {
                window.showToast(res.message || 'Failed to reopen billing.', 'error');
            }
        } catch (err) {
            window.showToast('Network error while reopening.', 'error');
        } finally {
            window.hideLoading();
        }
    };

    // Bind Confirm buttons inside the verify/reopen modals
    const btnConfirmVerify = document.getElementById('btnConfirmVerify');
    if (btnConfirmVerify) {
        btnConfirmVerify.onclick = window.verifyBilling;
    }
    const btnConfirmReopen = document.getElementById('btnConfirmReopen');
    if (btnConfirmReopen) {
        btnConfirmReopen.onclick = window.reopenBilling;
    }

    loadStaffListForModals();

    // --- INITIAL LOADING ---
    loadCustomers();
    
    // Deep-linking to tab via query parameter ?tab=payments
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'payments') {
        switchRecordTab('payments');
    } else if (tabParam === 'total') {
        switchRecordTab('total');
    } else if (tabParam === 'finance') {
        switchRecordTab('finance');
    } else {
        switchRecordTab('today');
    }
});
