window.safeFetch = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    const config = {
        ...options,
        signal: controller.signal,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    };
    
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    
    try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
            if (window.showToast) {
                window.showToast('Session expired. Please login again.', 'error');
            }
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            throw new Error('UNAUTHORIZED');
        }
        
        if (response.status === 403) {
            if (window.showToast) {
                window.showToast('You do not have permission to perform this action.', 'error');
            }
            throw new Error('FORBIDDEN');
        }
        
        const contentType = response.headers.get('content-type') || '';
        let data = {};
        
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            data = { success: true, rawText: text };
        }
        
        if (!response.ok) {
            const errMsg = data.message || `Request failed with status ${response.status}`;
            throw new Error(errMsg);
        }
        
        return data;
        
    } catch (err) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
            if (window.showToast) {
                window.showToast('Connection timed out. Please try again.', 'error');
            }
            throw new Error('Connection timed out.');
        }
        
        console.error(`[safeFetch Error] url: ${url}`, err);
        
        let friendlyMessage = err.message;
        if (err.message === 'Failed to fetch' || err.message.includes('network') || err.message.includes('load')) {
            friendlyMessage = 'Network connection error. Please check your internet connection.';
        } else if (err.message.includes('Server returned status') || err.message.includes('Unexpected token')) {
            friendlyMessage = 'Unable to complete request. Server encountered an issue.';
        }
        
        throw new Error(friendlyMessage);
    }
};

const initApp = () => {
    // Page Elements
    const loginForm = document.getElementById('loginForm');
    const customerForm = document.getElementById('customerForm');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogoutMobile = document.getElementById('btnLogoutMobile');
    const transactionMode = document.getElementById('transaction_mode');
    const emiSection = document.getElementById('financeProviderSection');
    const financeOption = document.getElementById('finance_provider');
    const btnScanBarcode = document.getElementById('btnScanBarcode');
    const imeiInput = document.getElementById('imei_number');
    const mobileInput = document.getElementById('mobile_number');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    // Sidebar View Navigation Buttons
    const navButtons = {
        'FORM': document.getElementById('btn-nav-form'),
        'TOTAL': document.getElementById('btn-nav-total'),
        'TODAY': document.getElementById('btn-nav-today'),
        'FINANCE': document.getElementById('btn-nav-finance'),
        'EDITOR': document.getElementById('btn-nav-editor')
    };

    // Main View Containers
    const views = {
        'FORM': document.getElementById('view-form-container'),
        'LEDGER': document.getElementById('view-ledger-container'),
        'EDITOR': document.getElementById('view-editor-container')
    };

    // Editor Elements
    const dbTextArea = document.getElementById('dbTextArea');
    const btnFormatJSON = document.getElementById('btnFormatJSON');
    const btnSaveJSON = document.getElementById('btnSaveJSON');

    // Ledger Elements
    const ledgerTableBody = document.getElementById('ledgerTableBody');
    const ledgerTitle = document.getElementById('ledgerTitle');
    const ledgerCount = document.getElementById('ledgerCount');
    const ledgerSearch = document.getElementById('ledgerSearch');

    // Store state of customers
    let allCustomers = [];
    let currentLedgerFilter = 'TOTAL'; // TOTAL, TODAY, FINANCE

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

        // Auto-fade out backdrop after 1 second
        setTimeout(() => {
            backdrop.classList.remove('active');
        }, 1000);

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') {
            icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        } else {
            icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        }

        toast.innerHTML = `
            <div class="toast-content">
                ${icon}
                <span>${message}</span>
            </div>
            <span class="toast-close">&times;</span>
            <div class="toast-progress"></div>
        `;

        container.appendChild(toast);

        const dismissToast = () => {
            toast.style.animation = 'toastPopOut 0.35s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards';
            setTimeout(() => toast.remove(), 350);
        };

        toast.querySelector('.toast-close').addEventListener('click', dismissToast);

        setTimeout(() => {
            if (toast.parentNode) {
                dismissToast();
            }
        }, 4000);
    };

    // --- LOGIN FORM ---
    if (loginForm) {
        const userIn = document.getElementById('employee_id');
        const passIn = document.getElementById('password');
        const errBlock = document.getElementById('loginErrorMessage');
        const errText = document.getElementById('errorMessageText');

        // Clear error highlights on focus/input
        const clearError = (input) => {
            if (input) input.classList.remove('input-error');
            if (errBlock) errBlock.classList.add('hidden');
        };
        if (userIn) {
            userIn.addEventListener('input', () => clearError(userIn));
            userIn.addEventListener('focus', () => clearError(userIn));
        }
        if (passIn) {
            passIn.addEventListener('input', () => clearError(passIn));
            passIn.addEventListener('focus', () => clearError(passIn));
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSignIn');
            if (errBlock) errBlock.classList.add('hidden');

            btn.disabled = true;
            btn.innerHTML = 'Signing In... <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employee_id: userIn.value.trim(),
                        password: passIn.value.trim()
                    })
                });

                const res = await response.json();

                if (response.ok && res.success) {
                    showToast('Authentication successful!', 'success');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    if (errBlock && errText) {
                        errText.textContent = res.message || 'Invalid credentials.';
                        errBlock.classList.remove('hidden');
                    }
                    loginForm.classList.add('shake-premium');
                    if (userIn) userIn.classList.add('input-error');
                    if (passIn) passIn.classList.add('input-error');
                    setTimeout(() => loginForm.classList.remove('shake-premium'), 600);
                    btn.disabled = false;
                    btn.innerHTML = 'SIGN IN <span class="material-symbols-outlined text-[20px]">login</span>';
                }
            } catch (err) {
                if (errBlock && errText) {
                    errText.textContent = 'Server connection failed.';
                    errBlock.classList.remove('hidden');
                }
                btn.disabled = false;
                btn.innerHTML = 'SIGN IN <span class="material-symbols-outlined text-[20px]">login</span>';
            }
        });

        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                showToast('Contact your Store Operations Manager or IT helpdesk.', 'error');
            });
        }
    }

    // --- LOGOUT ---
    const logoutAction = async () => {
        try {
            const res = await fetch('/api/logout', { method: 'POST' });
            if (res.ok) {
                showToast('Logged out successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 800);
            }
        } catch (err) {
            window.location.href = '/login';
        }
    };
    if (btnLogout) {
        btnLogout.addEventListener('click', logoutAction);
    }
    if (btnLogoutMobile) {
        btnLogoutMobile.addEventListener('click', logoutAction);
    }

    // --- VIEW SWITCHING NAVIGATION ---
    window.switchView = (targetView) => {
        // Toggle Sidebar Nav States
        Object.keys(navButtons).forEach(viewKey => {
            const btn = navButtons[viewKey];
            if (!btn) return;
            if (viewKey === targetView) {
                btn.className = 'w-full flex items-center gap-3 px-stack-md py-3 bg-[#0D70C0] text-white border-l-4 border-[#EE8133] shadow-sm transition-all rounded-lg group scale-[1.02] duration-300';
                btn.querySelector('.material-symbols-outlined').style.color = '#FFFFFF';
            } else {
                btn.className = 'w-full flex items-center gap-3 px-stack-md py-3 text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant hover:text-[#EE8133] hover:translate-x-1 transition-all rounded-lg group';
                btn.querySelector('.material-symbols-outlined').style.color = '';
            }
        });

        // Hide all views
        Object.values(views).forEach(container => {
            if (container) container.classList.add('hidden');
        });

        // Toggle Date Range Filters visibility and reset values if not on TOTAL view
        const dateFilterWrapper = document.getElementById('dateFilterWrapper');
        if (dateFilterWrapper) {
            if (targetView === 'TOTAL') {
                dateFilterWrapper.classList.remove('hidden');
                dateFilterWrapper.classList.add('flex');
            } else {
                dateFilterWrapper.classList.add('hidden');
                dateFilterWrapper.classList.remove('flex');
                const filterStartDate = document.getElementById('filterStartDate');
                const filterEndDate = document.getElementById('filterEndDate');
                if (filterStartDate) filterStartDate.value = '';
                if (filterEndDate) filterEndDate.value = '';
            }
        }

        // Show matching view
        if (targetView === 'FORM') {
            views.FORM.classList.remove('hidden');
        } else if (targetView === 'EDITOR') {
            views.EDITOR.classList.remove('hidden');
            loadRawDatabase();
        } else {
            // Ledger views: TOTAL, TODAY, FINANCE
            views.LEDGER.classList.remove('hidden');
            currentLedgerFilter = targetView;
            renderLedgerTable();
        }

        // Update Breadcrumb & Title dynamically
        const separator = document.getElementById('breadcrumb-separator');
        const current = document.getElementById('breadcrumb-current');
        const title = document.getElementById('page-title');

        if (separator && current && title) {
            const breadcrumbLabels = {
                'FORM': 'New Customer Entry',
                'TOTAL': 'Total Customers',
                'TODAY': "Today's Customers",
                'FINANCE': 'Finance Customers',
                'EDITOR': 'Database Text Editor'
            };

            const pageTitles = {
                'FORM': 'New Customer Entry',
                'TOTAL': 'Total Customers Directory',
                'TODAY': "Today's Customer Registrations",
                'FINANCE': 'Finance EMI Ledgers',
                'EDITOR': 'Database Text Editor'
            };

            const label = breadcrumbLabels[targetView];
            const pageTitle = pageTitles[targetView];

            if (label) {
                separator.classList.remove('hidden');
                current.textContent = label;
                title.textContent = pageTitle;
            } else {
                separator.classList.add('hidden');
                current.textContent = '';
                title.textContent = 'Executive Dashboard';
            }
        }

        // Close mobile sidebar overlay if open
        const sidebar = document.getElementById('side-nav');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024) {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    };

    // --- POPUP MODAL COMPONENT CONTROLLER ---
    window.openPopupModal = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;

        // Reset search input if searchable
        const searchInput = document.getElementById(`search-${id}`);
        if (searchInput) {
            searchInput.value = '';
            window.filterPopupOptions(id, '');
        }

        // Highlight selected option based on the input's current value and add checkmark
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
                if (checkIcon) {
                    checkIcon.remove();
                }
            }
        });

        // Open modal
        modal.classList.remove('hidden');
        // Force reflow
        modal.offsetHeight;

        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');

        const content = modal.querySelector('.popup-modal-content');
        if (content) {
            content.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
            content.classList.add('translate-y-0', 'sm:translate-y-0', 'sm:scale-100');
        }

        // Focus search input only (do not automatically highlight first option)
        setTimeout(() => {
            if (searchInput) {
                searchInput.focus();
            }
        }, 50);

        // Bind escape key
        document.addEventListener('keydown', handlePopupEscKey);
    };

    window.closePopupModal = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;

        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');

        const content = modal.querySelector('.popup-modal-content');
        if (content) {
            content.classList.remove('translate-y-0', 'sm:translate-y-0', 'sm:scale-100');
            content.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
        }

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);

        document.removeEventListener('keydown', handlePopupEscKey);
    };

    const handlePopupEscKey = (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('[id^="modal-"]:not(.hidden)');
            openModals.forEach(modal => {
                const id = modal.id.replace('modal-', '');
                window.closePopupModal(id);
            });
        }
    };

    window.selectPopupOption = (id, value) => {
        const input = document.getElementById(id);
        if (input) {
            input.value = value;
            input.classList.remove('border-rose-500', 'ring-1', 'ring-rose-500');
            
            // Dispatch change event to toggle dependent sections (e.g. Finance Provider conditional)
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        window.closePopupModal(id);
    };

    window.filterPopupOptions = (id, query) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;

        const list = modal.querySelector(`#list-${id}`) || modal.querySelector('.flex-col');
        if (!list) return;

        const items = list.querySelectorAll('.option-item');
        const cleanQuery = query.toLowerCase().trim();

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(cleanQuery)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    };

    // Form and barcode scanner event listeners removed. Managed by customer_entry.js.

    // --- LEDGER MANAGEMENT ---

    function renderLedgerTable() {
        if (!ledgerTableBody) return;

        const filterTitles = {
            'TOTAL': 'Total Customers Directory',
            'TODAY': "Today's Registrations",
            'FINANCE': 'Finance EMI Ledgers'
        };
        ledgerTitle.textContent = filterTitles[currentLedgerFilter] || 'Customer Ledgers';

        // Filter data
        const d = new Date();
        const todayStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
        let filtered = [];

        if (currentLedgerFilter === 'TOTAL') {
            filtered = allCustomers;
            
            // Apply Date Range Filter if filled (only for TOTAL view)
            const startDateVal = document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '';
            const endDateVal = document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '';

            if (startDateVal) {
                filtered = filtered.filter(c => {
                    if (!c.created_at) return false;
                    const datePart = c.created_at.split(' ')[0];
                    return datePart >= startDateVal;
                });
            }
            if (endDateVal) {
                filtered = filtered.filter(c => {
                    if (!c.created_at) return false;
                    const datePart = c.created_at.split(' ')[0];
                    return datePart <= endDateVal;
                });
            }
        } else if (currentLedgerFilter === 'TODAY') {
            filtered = allCustomers.filter(c => c.created_at && c.created_at.startsWith(todayStr));
        } else if (currentLedgerFilter === 'FINANCE') {
            filtered = allCustomers.filter(c => c.transaction_mode === 'Finance');
        }

        // Apply search input filter if filled
        const searchQuery = ledgerSearch ? ledgerSearch.value.trim().toLowerCase() : '';
        if (searchQuery) {
            filtered = filtered.filter(c =>
                (c.customer_name || '').toLowerCase().includes(searchQuery) ||
                (c.mobile_number || '').includes(searchQuery) ||
                (c.imei_number || '').includes(searchQuery) ||
                (c.item_model || '').toLowerCase().includes(searchQuery) ||
                (c.sales_person || '').toLowerCase().includes(searchQuery)
            );
        }

        ledgerCount.textContent = `Showing ${filtered.length} record${filtered.length === 1 ? '' : 's'}`;

        const ledgerCardList = document.getElementById('ledgerCardList');

        if (filtered.length === 0) {
            ledgerTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="px-6 py-12 text-center text-on-surface-variant opacity-60">
                        No customer entries found matching filters.
                    </td>
                </tr>
            `;
            if (ledgerCardList) ledgerCardList.innerHTML = `
                <div class="px-4 py-10 text-center text-on-surface-variant opacity-60 text-sm">
                    No customer entries found matching filters.
                </div>
            `;
            return;
        }

        // Render records newest to oldest
        const renderedRecords = [...filtered].sort((a, b) => {
            const timeA = a.created_at || '';
            const timeB = b.created_at || '';
            return timeB.localeCompare(timeA);
        });

        // ── Desktop table rows ──────────────────────────────────────────
        ledgerTableBody.innerHTML = renderedRecords.map(item => {
            const cid = item.customer_id || '';
            const isAdmin = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
            const isEmployee = window.currentUserRole === 'store_employee';
            const isLocked = !!item.record_locked;
            const canDelete = (window.currentUserRole === 'super_admin') || (window.currentUserRole === 'admin' && !isLocked);

            // Build edit/request-edit button based on role
            const editBtn = isAdmin
                ? `<button onclick="editCustomerDirectly('${cid}')" class="text-secondary hover:text-orange-700 transition-colors p-1.5 rounded-lg hover:bg-orange-50" title="Edit Record"><span class="material-symbols-outlined text-[18px]">edit</span></button>`
                : isEmployee
                ? `<button onclick="editCustomerDirectly('${cid}')" class="text-secondary hover:text-orange-700 transition-colors p-1.5 rounded-lg hover:bg-orange-50" title="Request Edit"><span class="material-symbols-outlined text-[18px]">edit_note</span></button>`
                : '';

            const deleteBtn = canDelete
                ? `<button onclick="deleteRecord('${cid}')" class="text-error hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Delete Record"><span class="material-symbols-outlined text-[18px]">delete</span></button>`
                : '';

            return `
                <tr class="odd:bg-[#0D70C0]/5 even:bg-white hover:bg-[#0D70C0]/10 transition-colors duration-200 group">
                    <td class="px-6 py-4 font-data-mono text-body-sm text-on-surface-variant whitespace-nowrap">${escapeHtml(item.created_at)}</td>
                    <td class="px-6 py-4 font-bold text-primary hover:underline cursor-pointer whitespace-nowrap" onclick="viewCustomer('${cid}')">
                        ${escapeHtml(item.customer_name)}
                    </td>
                    <td class="px-6 py-4 text-on-surface font-medium whitespace-nowrap">${escapeHtml(item.item_model)}</td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex justify-end gap-2">
                            <button onclick="viewCustomer('${cid}')" class="text-primary hover:text-blue-800 transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="View Details">
                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            ${editBtn}
                            ${deleteBtn}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // ── Mobile card list ────────────────────────────────────────────
        if (ledgerCardList) {
            ledgerCardList.innerHTML = renderedRecords.map((item, idx) => {
                const cid = item.customer_id || '';
                const isAdmin = (window.currentUserRole === 'super_admin' || window.currentUserRole === 'admin');
                const isEmployee = window.currentUserRole === 'store_employee';
                const isLocked = !!item.record_locked;
                const canDelete = (window.currentUserRole === 'super_admin') || (window.currentUserRole === 'admin' && !isLocked);

                const editBtnMobile = isAdmin
                    ? `<button onclick="editCustomerDirectly('${cid}')" class="text-secondary hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50" title="Edit Record"><span class="material-symbols-outlined text-[20px]">edit</span></button>`
                    : isEmployee
                    ? `<button onclick="editCustomerDirectly('${cid}')" class="text-secondary hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50" title="Request Edit"><span class="material-symbols-outlined text-[20px]">edit_note</span></button>`
                    : '';

                const deleteBtnMobile = canDelete
                    ? `<button onclick="deleteRecord('${cid}')" class="text-rose-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50" title="Delete Record"><span class="material-symbols-outlined text-[20px]">delete</span></button>`
                    : '';

                return `
                <div class="bg-white border-b border-outline-variant last:border-b-0">
                    <div class="flex items-center justify-between px-4 py-3.5 ${idx % 2 === 0 ? 'bg-[#0D70C0]/5' : 'bg-white'}">
                        <div class="flex items-center gap-3 min-w-0 cursor-pointer" onclick="viewCustomer('${cid}')">
                            <div class="w-9 h-9 rounded-full bg-[#0D70C0]/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                                ${escapeHtml(item.customer_name.charAt(0).toUpperCase())}
                            </div>
                            <div class="min-w-0">
                                <p class="font-bold text-primary hover:underline text-[15px] leading-tight">${escapeHtml(item.customer_name)}</p>
                                <p class="text-xs text-on-surface-variant font-medium mt-0.5">${escapeHtml(item.item_model)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button onclick="viewCustomer('${cid}')"
                                class="text-primary hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50" title="View details">
                                <span class="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            ${editBtnMobile}
                            ${deleteBtnMobile}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

    };


    // Live search in table
    if (ledgerSearch) {
        ledgerSearch.addEventListener('input', renderLedgerTable);
    }

    // Date Range Filters listeners
    const filterStartDate = document.getElementById('filterStartDate');
    const filterEndDate = document.getElementById('filterEndDate');
    const btnClearDateFilters = document.getElementById('btnClearDateFilters');
    const btnClearDateFiltersMobile = document.getElementById('btnClearDateFiltersMobile');

    if (filterStartDate) {
        filterStartDate.addEventListener('change', renderLedgerTable);
    }
    if (filterEndDate) {
        filterEndDate.addEventListener('change', renderLedgerTable);
    }

    const clearDateFilters = () => {
        if (filterStartDate) filterStartDate.value = '';
        if (filterEndDate) filterEndDate.value = '';
        renderLedgerTable();
    };

    if (btnClearDateFilters) {
        btnClearDateFilters.addEventListener('click', clearDateFilters);
    }
    if (btnClearDateFiltersMobile) {
        btnClearDateFiltersMobile.addEventListener('click', clearDateFilters);
    }

    // Navigate to edit/request-edit page for a customer
    window.editCustomerDirectly = (customerId) => {
        if (!customerId) { showToast('Invalid customer ID.', 'error'); return; }
        window.location.href = `/customers/${customerId}/request-edit`;
    };

    // Delete customer endpoint caller
    window.deleteRecord = async (customerId) => {
        if (!customerId) {
            showToast('Cannot delete: missing customer ID.', 'error');
            console.error('[deleteRecord] called with missing/undefined customerId');
            return false;
        }

        const confirmVal = await window.showConfirm(
            `Are you sure you want to permanently delete customer record <strong>${customerId}</strong>? This action cannot be undone.`,
            'danger',
            'Delete Customer Record'
        );
        if (!confirmVal) return false;

        try {
            window.showLoading('Deleting Customer Record...');
            const response = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
            const res = await response.json();

            if (response.ok && res.success) {
                showToast(`Record ${customerId} deleted successfully.`, 'success');
                loadDashboardData();
                return true;
            } else {
                console.error(`[deleteRecord] Backend error for ID=${customerId}:`, res.message);
                showToast(res.message || 'Failed to delete record.', 'error');
                return false;
            }
        } catch (err) {
            console.error('[deleteRecord] Network error:', err);
            showToast('Network connection error while deleting record.', 'error');
            return false;
        } finally {
            window.hideLoading();
        }
    };

    // View Customer details modal caller
    window.viewCustomer = (customerId) => {
        const item = allCustomers.find(c => c.customer_id === customerId);
        if (!item) {
            console.error('[viewCustomer] No customer found for ID:', customerId);
            return;
        }

        // Populate details
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

        const isLocked = !!item.record_locked;
        const canDelete = (window.currentUserRole === 'super_admin') || (window.currentUserRole === 'admin' && !isLocked);

        // Set up the delete button in modal
        const btnDelete = document.getElementById('btnDeleteFromModal');
        if (btnDelete) {
            if (canDelete) {
                btnDelete.classList.remove('hidden');
                btnDelete.onclick = async () => {
                    const confirmed = await window.deleteRecord(customerId);
                    if (confirmed) {
                        window.closeCustomerDetailModal();
                    }
                };
            } else {
                btnDelete.classList.add('hidden');
            }
        }

        // Set up the edit button in modal
        const btnEdit = document.getElementById('btnEditFromModal');
        if (btnEdit) {
            if (isAdmin) {
                btnEdit.classList.remove('hidden');
                btnEdit.innerHTML = `<span class="material-symbols-outlined text-[16px]">edit</span> Edit Record`;
            } else if (isEmployee) {
                btnEdit.classList.remove('hidden');
                btnEdit.innerHTML = `<span class="material-symbols-outlined text-[16px]">edit_note</span> Request Edit`;
            } else {
                btnEdit.classList.add('hidden');
            }
            btnEdit.onclick = () => { editCustomerDirectly(customerId); };
        }

        const modal = document.getElementById('customerDetailModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeCustomerDetailModal = () => {
        const modal = document.getElementById('customerDetailModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    // --- RAW DATABASE EDITOR ---

    async function loadRawDatabase() {
        if (!dbTextArea) return;
        dbTextArea.value = 'Loading contents...';
        
        try {
            const response = await fetch('/api/raw-data');
            const res = await response.json();
            if (response.ok && res.success) {
                dbTextArea.value = res.raw;
            } else {
                dbTextArea.value = 'Failed to load file contents: ' + (res.message || 'unknown error');
            }
        } catch (err) {
            dbTextArea.value = 'Error connecting to raw-data API.';
        }
    }

    if (btnFormatJSON && dbTextArea) {
        btnFormatJSON.addEventListener('click', () => {
            try {
                const parsed = JSON.parse(dbTextArea.value);
                dbTextArea.value = JSON.stringify(parsed, null, 4);
                showToast('JSON formatted successfully.', 'success');
            } catch (err) {
                showToast('Invalid JSON structure: ' + err.message, 'error');
            }
        });
    }

    if (btnSaveJSON && dbTextArea) {
        btnSaveJSON.addEventListener('click', async () => {
            btnSaveJSON.disabled = true;
            btnSaveJSON.textContent = 'Saving...';

            try {
                const text = dbTextArea.value.trim();
                const response = await fetch('/api/raw-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ raw: text })
                });

                const res = await response.json();

                if (response.ok && res.success) {
                    showToast('Database file saved successfully!', 'success');
                    loadDashboardData(); // Reload statistics
                } else {
                    showToast(res.message || 'Failed to save raw data.', 'error');
                }
            } catch (err) {
                showToast('Database saving failed.', 'error');
            } finally {
                btnSaveJSON.disabled = false;
                btnSaveJSON.textContent = 'Save Database File';
            }
        });
    }

    // --- DASHBOARD LOADER & ANIMATED METRICS ---

    async function loadDashboardData() {
        // If we are on a page without stats elements or a ledger table, bypass loading data
        if (!document.getElementById('countTotal') && !document.getElementById('ledgerTableBody')) return;

        try {
            const response = await fetch('/api/customers');
            if (response.ok) {
                const res = await response.json();
                if (res.success) {
                    allCustomers = res.data || [];
                    updateStatsAndLedgers();
                }
            }
        } catch (err) {
            console.error('Stats loading error:', err);
        }

        try {
            await loadPaymentSummaryDashboard();
        } catch (err) {
            console.error('Payment summary load error:', err);
        }

        // Fetch CRM Walk-ins count
        try {
            const crmRes = await fetch('/api/crm-walkin-customers');
            if (crmRes.ok) {
                const crmData = await crmRes.json();
                const crmCount = (crmData.data || []).length;
                const crmEl = document.getElementById('countCrm');
                if (crmEl) animateCounter(crmEl, crmCount);
            }
        } catch (err) {
            console.error('CRM load error:', err);
        }

        // Fetch Pending Edit Requests count
        try {
            const editRes = await fetch('/api/edit-requests');
            if (editRes.ok) {
                const editData = await editRes.json();
                const pendingEdits = (editData.data || []).filter(e => e.status === 'pending').length;
                const editsEl = document.getElementById('countEdits');
                if (editsEl) animateCounter(editsEl, pendingEdits);
            } else {
                const editsEl = document.getElementById('countEdits');
                if (editsEl) editsEl.textContent = 'N/A';
            }
        } catch (err) {
            console.error('Edits load error:', err);
        }

        // Fetch Pending Payments count
        try {
            const payRes = await fetch('/api/payments');
            if (payRes.ok) {
                const payData = await payRes.json();
                const payments = payData.data || [];
                const pendingPayments = payments.filter(p => p.payment_status !== 'Fully Paid').length;
                const paymentsEl = document.getElementById('countPayments');
                if (paymentsEl) animateCounter(paymentsEl, pendingPayments);
            } else {
                const paymentsEl = document.getElementById('countPayments');
                if (paymentsEl) paymentsEl.textContent = 'N/A';
            }
        } catch (err) {
            console.error('Payments load error:', err);
        }
    }

    async function loadPaymentSummaryDashboard() {
        const todayCashEl = document.getElementById('dashTodayCash');
        const todayCardEl = document.getElementById('dashTodayCard');
        const todayEWalletEl = document.getElementById('dashTodayEWallet');
        const todayPendingEl = document.getElementById('dashTodayPending');
        const totalUnsettledEl = document.getElementById('dashTotalUnsettled');

        if (!todayCashEl) return;

        try {
            const res = await fetch('/api/payment-summary');
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.summary) {
                const s = data.summary;
                todayCashEl.textContent = `₹${Math.round(s.today_cash_sales).toLocaleString()}`;
                todayCardEl.textContent = `₹${Math.round(s.today_card_sales).toLocaleString()}`;
                todayEWalletEl.textContent = `₹${Math.round(s.today_ewallet_sales).toLocaleString()}`;
                todayPendingEl.textContent = `₹${Math.round(s.today_pending_amount).toLocaleString()}`;
                totalUnsettledEl.textContent = `₹${Math.round(s.total_unsettled_amount).toLocaleString()}`;
            }
        } catch (err) {
            console.error('Payment summary load error:', err);
        }
    }

    function updateStatsAndLedgers() {
        const countTotalEl = document.getElementById('countTotal');
        const countTodayEl = document.getElementById('countToday');
        const countFinanceEl = document.getElementById('countFinance');

        const d = new Date();
        const todayStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

        let todayCount = 0;
        let financeCount = 0;

        allCustomers.forEach(item => {
            if (item.created_at && item.created_at.startsWith(todayStr)) {
                todayCount++;
            }
            if (item.transaction_mode === 'Finance') {
                financeCount++;
            }
        });

        animateCounter(countTotalEl, allCustomers.length);
        animateCounter(countTodayEl, todayCount);
        animateCounter(countFinanceEl, financeCount);

        // If a ledger is active, refresh its list table
        const ledgerContainer = views.LEDGER;
        if (ledgerContainer && !ledgerContainer.classList.contains('hidden')) {
            renderLedgerTable();
        }

        // If raw editor is active, reload its contents
        const editorContainer = views.EDITOR;
        if (editorContainer && !editorContainer.classList.contains('hidden')) {
            loadRawDatabase();
        }
    }

    function animateCounter(element, targetValue) {
        if (!element) return;
        const startValue = parseInt(element.textContent) || 0;
        if (startValue === targetValue) return;

        const duration = 400; // ms
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = progress * (2 - progress);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
            
            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = targetValue;
            }
        }
        requestAnimationFrame(update);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Deep-linking based on URL query parameter ?view=TOTAL etc.
    const urlParams = new URLSearchParams(window.location.search);
    let viewParam = urlParams.get('view');
    if (!viewParam && window.location.pathname.includes('customer-history')) {
        viewParam = 'TOTAL';
    }
    if (viewParam) {
        setTimeout(() => {
            if (views[viewParam] || (viewParam === 'TODAY' || viewParam === 'FINANCE' || viewParam === 'TOTAL')) {
                switchView(viewParam);
            }
        }, 100);
    }

    // Initialize Page Stats loading
    loadDashboardData();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

window.openIMEIScanner = function(onSuccess) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errMsg = 'Camera access requires a secure connection (HTTPS) or localhost.';
        console.error(errMsg);
        if (window.showToast) window.showToast(errMsg, 'error');
        else alert(errMsg);
        return;
    }

    // Clean up any existing scanner instances
    const existingOverlay = document.getElementById('fullScreenScanner');
    if (existingOverlay) existingOverlay.remove();
    const existingStyles = document.getElementById('fullScreenScannerStyles');
    if (existingStyles) existingStyles.remove();

    // 1. Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'fullScreenScanner';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.background = '#000000';
    overlay.style.display = 'block'; // Force block to avoid flex collapse
    overlay.style.overflow = 'hidden';
    overlay.style.fontFamily = "'Inter', sans-serif";

    // 2. Create camera preview container
    const readerDiv = document.createElement('div');
    readerDiv.id = 'fullScreenScannerReader';
    overlay.appendChild(readerDiv);

    // 3. Create cutout overlay
    const cutoutOverlay = document.createElement('div');
    cutoutOverlay.style.position = 'absolute';
    cutoutOverlay.style.inset = '0';
    cutoutOverlay.style.zIndex = '2';
    cutoutOverlay.style.pointerEvents = 'none';
    cutoutOverlay.style.display = 'flex';
    cutoutOverlay.style.alignItems = 'center';
    cutoutOverlay.style.justifyContent = 'center';

    const cutout = document.createElement('div');
    cutout.className = 'scanner-cutout-glow';
    cutout.style.position = 'relative';
    cutout.style.width = '85%';
    cutout.style.maxWidth = '340px';
    cutout.style.height = '120px';
    cutout.style.borderRadius = '16px';
    cutout.style.boxSizing = 'border-box';
    
    // Add thicker premium corner markers
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    corners.forEach(pos => {
        const corner = document.createElement('div');
        corner.style.position = 'absolute';
        corner.style.width = '24px';
        corner.style.height = '24px';
        corner.style.borderColor = '#0D70C0'; // Sangeetha Brand Blue
        corner.style.borderStyle = 'solid';
        corner.style.borderWidth = '0';
        
        if (pos === 'top-left') {
            corner.style.top = '-2px';
            corner.style.left = '-2px';
            corner.style.borderTopWidth = '4px';
            corner.style.borderLeftWidth = '4px';
            corner.style.borderTopLeftRadius = '16px';
        } else if (pos === 'top-right') {
            corner.style.top = '-2px';
            corner.style.right = '-2px';
            corner.style.borderTopWidth = '4px';
            corner.style.borderRightWidth = '4px';
            corner.style.borderTopRightRadius = '16px';
        } else if (pos === 'bottom-left') {
            corner.style.bottom = '-2px';
            corner.style.left = '-2px';
            corner.style.borderBottomWidth = '4px';
            corner.style.borderLeftWidth = '4px';
            corner.style.borderBottomLeftRadius = '16px';
        } else if (pos === 'bottom-right') {
            corner.style.bottom = '-2px';
            corner.style.right = '-2px';
            corner.style.borderBottomWidth = '4px';
            corner.style.borderRightWidth = '4px';
            corner.style.borderBottomRightRadius = '16px';
        }
        cutout.appendChild(corner);
    });

    const laser = document.createElement('div');
    laser.className = 'scanner-laser';
    cutout.appendChild(laser);
    
    cutoutOverlay.appendChild(cutout);
    overlay.appendChild(cutoutOverlay);

    // 4. Create Top Navigation Bar
    const topBar = document.createElement('div');
    topBar.style.position = 'absolute';
    topBar.style.top = '20px';
    topBar.style.left = '16px';
    topBar.style.right = '16px';
    topBar.style.height = '60px';
    topBar.style.borderRadius = '16px';
    topBar.style.background = 'rgba(15, 23, 42, 0.6)';
    topBar.style.backdropFilter = 'blur(16px)';
    topBar.style.webkitBackdropFilter = 'blur(16px)';
    topBar.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    topBar.style.display = 'flex';
    topBar.style.alignItems = 'center';
    topBar.style.justifyContent = 'space-between';
    topBar.style.padding = '0 16px';
    topBar.style.zIndex = '10';
    topBar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    overlay.appendChild(topBar);

    // Title inside top bar
    const titleDiv = document.createElement('div');
    titleDiv.style.display = 'flex';
    titleDiv.style.alignItems = 'center';
    titleDiv.style.gap = '10px';
    titleDiv.style.color = '#ffffff';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined';
    iconSpan.innerText = 'barcode_scanner';
    iconSpan.style.color = '#3b82f6';
    iconSpan.style.fontSize = '24px';
    iconSpan.style.animation = 'pulseGlow 2s infinite';
    titleDiv.appendChild(iconSpan);

    const textSpan = document.createElement('span');
    textSpan.innerText = 'Sangeetha IMEI Scanner';
    textSpan.style.fontSize = '15px';
    textSpan.style.fontWeight = '700';
    textSpan.style.letterSpacing = '0.5px';
    titleDiv.appendChild(textSpan);
    topBar.appendChild(titleDiv);

    // Actions container in top bar
    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.alignItems = 'center';
    actionsDiv.style.gap = '10px';
    topBar.appendChild(actionsDiv);

    // Flash / Torch button
    const flashBtn = document.createElement('button');
    flashBtn.type = 'button';
    flashBtn.id = 'fullScreenScannerFlash';
    flashBtn.className = 'scanner-btn';
    flashBtn.style.display = 'none'; // hidden initially
    flashBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">flashlight_on</span>';
    actionsDiv.appendChild(flashBtn);

    // Switch Camera button
    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.id = 'fullScreenScannerSwitch';
    switchBtn.className = 'scanner-btn';
    switchBtn.style.display = 'none'; // hidden initially
    switchBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">switch_camera</span>';
    actionsDiv.appendChild(switchBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.id = 'fullScreenScannerClose';
    closeBtn.className = 'scanner-btn';
    closeBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">close</span>';
    actionsDiv.appendChild(closeBtn);

    // 5. Create Bottom Info Card
    const bottomCard = document.createElement('div');
    bottomCard.style.position = 'absolute';
    bottomCard.style.bottom = '24px';
    bottomCard.style.left = '16px';
    bottomCard.style.right = '16px';
    bottomCard.style.borderRadius = '16px';
    bottomCard.style.background = 'rgba(15, 23, 42, 0.6)';
    bottomCard.style.backdropFilter = 'blur(16px)';
    bottomCard.style.webkitBackdropFilter = 'blur(16px)';
    bottomCard.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    bottomCard.style.padding = '16px 20px';
    bottomCard.style.zIndex = '10';
    bottomCard.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    bottomCard.style.textAlign = 'center';
    overlay.appendChild(bottomCard);

    const bTitle = document.createElement('div');
    bTitle.innerText = 'Scan IMEI Barcode';
    bTitle.style.color = '#ffffff';
    bTitle.style.fontSize = '14px';
    bTitle.style.fontWeight = '700';
    bTitle.style.marginBottom = '4px';
    bottomCard.appendChild(bTitle);

    const bDesc = document.createElement('div');
    bDesc.innerText = 'Position the barcode inside the target box to scan';
    bDesc.style.color = 'rgba(255, 255, 255, 0.7)';
    bDesc.style.fontSize = '11px';
    bDesc.style.fontWeight = '400';
    bottomCard.appendChild(bDesc);

    // Append styles for video element and forced full-screen layouts
    const styleEl = document.createElement('style');
    styleEl.id = 'fullScreenScannerStyles';
    styleEl.textContent = `
        @keyframes scan {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
        }
        @keyframes pulseGlow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(1.03); }
            to { opacity: 1; transform: scale(1); }
        }
        .scanner-overlay-animate {
            animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scanner-laser {
            position: absolute;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, transparent, #3b82f6, #0D70C0, #3b82f6, transparent);
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
            animation: scan 3s ease-in-out infinite;
            pointer-events: none;
            z-index: 3;
        }
        .scanner-cutout-glow {
            box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.75), 0 0 25px rgba(13, 112, 192, 0.25);
            border: 2px solid rgba(255, 255, 255, 0.15);
        }
        .scanner-btn {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            outline: none;
        }
        .scanner-btn:hover {
            background: rgba(255, 255, 255, 0.18);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }
        .scanner-btn:active {
            transform: scale(0.92);
        }
        #fullScreenScannerReader {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            inset: 0 !important;
            z-index: 1 !important;
            background: #000000 !important;
        }
        #fullScreenScannerReader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            object-position: center center !important;
            display: block !important;
        }
    `;
    document.head.appendChild(styleEl);

    overlay.className = 'scanner-overlay-animate';
    document.body.appendChild(overlay);

    let formats = null;
    if (window.Html5QrcodeSupportedFormats) {
        formats = [
            window.Html5QrcodeSupportedFormats.CODE_128,
            window.Html5QrcodeSupportedFormats.EAN_13,
            window.Html5QrcodeSupportedFormats.EAN_8
        ];
    }
    const html5QrCode = new Html5Qrcode('fullScreenScannerReader', formats ? { formatsToSupport: formats } : undefined);
    let isScanning = false;
    let currentCameraIndex = 0;
    let availableCameras = [];

    // Setup MutationObserver to force video elements to play inline and muted recursively
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const videoEl = node.tagName === 'VIDEO' ? node : node.querySelector('video');
                    if (videoEl) {
                        videoEl.setAttribute('playsinline', 'true');
                        videoEl.setAttribute('webkit-playsinline', 'true');
                        videoEl.muted = true;
                        videoEl.setAttribute('muted', 'true');
                        videoEl.setAttribute('autoplay', 'true');
                        videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
                    }
                }
            }
        }
    });
    observer.observe(readerDiv, { childList: true, subtree: true });

    const cleanUp = () => {
        observer.disconnect();
        if (html5QrCode && isScanning) {
            isScanning = false;
            html5QrCode.stop().then(() => {
                overlay.remove();
                styleEl.remove();
            }).catch(() => {
                overlay.remove();
                styleEl.remove();
            });
        } else {
            overlay.remove();
            styleEl.remove();
        }
    };

    closeBtn.onclick = cleanUp;

    // Config
    const config = {
        fps: 25,
        qrbox: null // Custom cutout drawn by us
    };

    const startCamera = (constraints) => {
        return html5QrCode.start(
            constraints,
            config,
            (decodedText) => {
                const trimmed = decodedText.trim();
                if (/^\d{15}$/.test(trimmed)) {
                    // Play beep and vibrate
                    try {
                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
                        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                        osc.start();
                        setTimeout(() => {
                            osc.stop();
                            audioCtx.close();
                        }, 80);
                    } catch(e) {}

                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }

                    // Stop and close
                    if (isScanning) {
                        isScanning = false;
                        html5QrCode.stop().then(() => {
                            overlay.remove();
                            styleEl.remove();
                            observer.disconnect();
                            onSuccess(trimmed);
                        }).catch(() => {
                            overlay.remove();
                            styleEl.remove();
                            observer.disconnect();
                            onSuccess(trimmed);
                        });
                    }
                }
            },
            () => {
                // Ignore scan errors/warnings for smooth continuous scanning
            }
        ).then(() => {
            // Query cameras list again now that permission is granted
            Html5Qrcode.getCameras().then(devices => {
                if (devices && devices.length > 1) {
                    availableCameras = devices;
                    switchBtn.style.display = 'flex';
                }
            }).catch(e => console.warn('getCameras list error:', e));

            // Force play video just in case MutationObserver missed it
            const video = readerDiv.querySelector('video');
            if (video) {
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.muted = true;
                video.setAttribute('muted', 'true');
                video.setAttribute('autoplay', 'true');
                video.play().catch(e => console.warn('Autoplay force check prevented:', e));
            }
        });
    };

    const updateFlashButtonUI = (isOn) => {
        if (isOn) {
            flashBtn.style.background = '#eab308'; // Amber/Yellow background
            flashBtn.style.color = '#000000';      // Dark icon for contrast
            flashBtn.style.borderColor = '#eab308';
            flashBtn.style.boxShadow = '0 0 15px rgba(234, 179, 8, 0.6)';
            flashBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: \'FILL\' 1;">flashlight_on</span>';
        } else {
            flashBtn.style.background = 'rgba(255, 255, 255, 0.08)'; // Back to standard frosted glass
            flashBtn.style.color = '#ffffff';
            flashBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            flashBtn.style.boxShadow = 'none';
            flashBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">flashlight_off</span>';
        }
    };

    const setupTorch = () => {
        const track = html5QrCode.getRunningTrack();
        if (track) {
            // Find active camera index from track label
            const activeLabel = track.label;
            if (activeLabel && availableCameras.length > 0) {
                const matchIndex = availableCameras.findIndex(c => c.label === activeLabel);
                if (matchIndex !== -1) {
                    currentCameraIndex = matchIndex;
                }
            }
            if (typeof track.getCapabilities === 'function') {
                try {
                    const capabilities = track.getCapabilities();
                    if (capabilities.torch) {
                        flashBtn.style.display = 'flex';
                        
                        // Set initial state based on track settings
                        const settings = track.getSettings();
                        const isTorchOn = settings.torch || false;
                        updateFlashButtonUI(isTorchOn);

                        flashBtn.onclick = async () => {
                            const currentSettings = track.getSettings();
                            const nextTorchState = !(currentSettings.torch || false);
                            try {
                                await track.applyConstraints({
                                    advanced: [{ torch: nextTorchState }]
                                });
                                updateFlashButtonUI(nextTorchState);
                            } catch (err) {
                                console.error('Failed to toggle torch:', err);
                            }
                        };
                    } else {
                        flashBtn.style.display = 'none';
                    }
                } catch(e) {
                    flashBtn.style.display = 'none';
                }
            } else {
                flashBtn.style.display = 'none';
            }
        }
    };

    let switchRotation = 0;
    const toggleCamera = () => {
        if (availableCameras.length <= 1) return;
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        const targetCameraId = availableCameras[currentCameraIndex].id;

        // Animate the button spin
        switchRotation += 180;
        switchBtn.style.transform = `rotate(${switchRotation}deg)`;

        if (html5QrCode && isScanning) {
            isScanning = false;
            flashBtn.style.display = 'none'; // hidden during transition
            updateFlashButtonUI(false);      // reset flash UI
            bDesc.innerText = 'Switching camera feed...';
            bDesc.style.color = '#3b82f6';
            html5QrCode.stop().then(() => {
                startCamera(targetCameraId).then(() => {
                    isScanning = true;
                    setupTorch();
                    bDesc.innerText = 'Position the barcode inside the target box to scan';
                    bDesc.style.color = 'rgba(255, 255, 255, 0.7)';
                }).catch(err => {
                    console.error('Failed to switch to camera:', err);
                    // Start with environment fallback to recover
                    startCamera({ facingMode: 'environment' }).then(() => {
                        isScanning = true;
                        setupTorch();
                        bDesc.innerText = 'Position the barcode inside the target box to scan';
                        bDesc.style.color = 'rgba(255, 255, 255, 0.7)';
                    });
                });
            }).catch(e => {
                console.error('Failed to stop camera for switching:', e);
                bDesc.innerText = 'Position the barcode inside the target box to scan';
                bDesc.style.color = 'rgba(255, 255, 255, 0.7)';
            });
        }
    };
    switchBtn.onclick = toggleCamera;

    const startWithFacingModeFallback = () => {
        startCamera({ facingMode: 'environment' }).then(() => {
            isScanning = true;
            setupTorch();
        }).catch(err => {
            console.warn('facingMode environment failed, trying user camera:', err);
            startCamera({ facingMode: 'user' }).then(() => {
                isScanning = true;
                setupTorch();
            }).catch(err2 => {
                console.error('All camera attempts failed:', err2);
                isScanning = false;
                cleanUp();
                const failMsg = 'Failed to start camera. Please verify camera permission in your browser/system settings.';
                if (window.showToast) window.showToast(failMsg, 'error');
                else alert(failMsg);
            });
        });
    };

    // Fallback cascade to ensure scanner opens on any platform/device
    // First query available cameras (this triggers permissions and names them)
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
            availableCameras = devices;
            if (devices.length > 1) {
                switchBtn.style.display = 'flex';
            }
            
            // Try to find a back/rear camera
            let targetId = devices[0].id;
            const backCamera = devices.find(d => {
                const label = (d.label || '').toLowerCase();
                return label.includes('back') || label.includes('rear') || label.includes('environment');
            });
            if (backCamera) {
                targetId = backCamera.id;
                currentCameraIndex = devices.indexOf(backCamera);
            } else {
                currentCameraIndex = 0;
            }
            
            startCamera(targetId).then(() => {
                isScanning = true;
                setupTorch();
            }).catch(err3 => {
                console.warn('Failed to start chosen camera device, trying facingMode fallback...', err3);
                startWithFacingModeFallback();
            });
        } else {
            startWithFacingModeFallback();
        }
    }).catch(err => {
        console.warn('getCameras failed, trying facingMode fallback:', err);
        startWithFacingModeFallback();
    });
};

