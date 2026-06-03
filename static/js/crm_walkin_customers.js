document.addEventListener('DOMContentLoaded', () => {
    // Current user context
    const userRole = window.currentUserRole || 'store_employee';
    const username = window.currentUsername || '';
    const isAdminOrSuper = (userRole === 'admin' || userRole === 'super_admin');

    // DOM Elements
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sideNav = document.getElementById('side-nav');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogoutMobile = document.getElementById('btnLogoutMobile');

    const crmCountTotal = document.getElementById('crmCountTotal');
    const crmCountToday = document.getElementById('crmCountToday');
    const crmCountEnquiry = document.getElementById('crmCountEnquiry');
    const crmCountPricing = document.getElementById('crmCountPricing');

    const crmSearchInput = document.getElementById('crmSearchInput');
    const crmFilterStartDate = document.getElementById('crmFilterStartDate');
    const crmFilterEndDate = document.getElementById('crmFilterEndDate');
    const crmFilterReason = document.getElementById('crmFilterReason');
    const crmFilterSalesPerson = document.getElementById('crmFilterSalesPerson');
    const btnClearFilters = document.getElementById('btnClearFilters');

    const crmTableBody = document.getElementById('crmTableBody');
    const crmCardList = document.getElementById('crmCardList');

    const crmFormModal = document.getElementById('crmFormModal');
    const crmForm = document.getElementById('crmForm');
    const crmModalTitle = document.getElementById('crmModalTitle');
    const crmRecordIdInput = document.getElementById('crm_record_id');

    const crmCustomerNameInput = document.getElementById('crm_customer_name');
    const crmMobileNumberInput = document.getElementById('crm_mobile_number');
    const crmModelItemInput = document.getElementById('crm_model_item');
    const crmWalkoutReasonInput = document.getElementById('crm_walkout_reason');
    const crmRemarksInput = document.getElementById('crm_remarks');
    const crmSalesPersonInput = document.getElementById('crm_sales_person');

    // Detail Modal Elements
    const crmDetailModal = document.getElementById('crmDetailModal');
    const detailInitial = document.getElementById('detail_initial');
    const detailName = document.getElementById('detail_name');
    const detailId = document.getElementById('detail_id');
    const detailMobile = document.getElementById('detail_mobile');
    const detailModel = document.getElementById('detail_model');
    const detailReason = document.getElementById('detail_reason');
    const detailSalesperson = document.getElementById('detail_salesperson');
    const detailCreatedby = document.getElementById('detail_createdby');
    const detailCreatedat = document.getElementById('detail_createdat');
    const detailUpdatedat = document.getElementById('detail_updatedat');
    const detailRemarks = document.getElementById('detail_remarks');
    const btnEditFromModal = document.getElementById('btnEditFromModal');
    const btnDeleteFromModal = document.getElementById('btnDeleteFromModal');

    // State Variables
    let allCrmRecords = [];

    // --- SIDEBAR TOGGLE ---
    if (mobileMenuToggle && sideNav && sidebarOverlay) {
        const toggleSidebar = () => {
            const isHidden = sideNav.classList.contains('-translate-x-full');
            if (isHidden) {
                sideNav.classList.remove('-translate-x-full');
                sidebarOverlay.classList.remove('hidden');
            } else {
                sideNav.classList.add('-translate-x-full');
                sidebarOverlay.classList.add('hidden');
            }
        };
        mobileMenuToggle.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // --- LOGOUT ACTION ---
    const logoutAction = async () => {
        try {
            const response = await fetch('/api/logout', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (err) {
            showToast('Connection error on logout.', 'error');
        }
    };
    if (btnLogout) btnLogout.addEventListener('click', logoutAction);
    if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', logoutAction);

    // --- TOAST NOTIFICATIONS ---
    window.showToast = (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconName = type === 'success' ? 'check_circle' : 'error';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="material-symbols-outlined">${iconName}</span>
                <span>${message}</span>
            </div>
            <span class="toast-close material-symbols-outlined" onclick="this.parentElement.remove()">close</span>
            <div class="toast-progress"></div>
        `;
        container.appendChild(toast);
        
        const dismiss = () => {
            toast.style.animation = 'toastPopIn 0.35s ease forwards reverse';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 350);
        };
        setTimeout(() => { if (toast.parentNode) dismiss(); }, 4000);
    };

    // --- FORMAT DATE/TIME SAFETY ---
    const formatDateTime = (dateStr) => {
        return dateStr || '—';
    };

    // --- DATA LOADING & CALCULATIONS ---
    const fetchCrmData = async () => {
        try {
            const params = new URLSearchParams();
            if (crmFilterStartDate && crmFilterStartDate.value) params.append('start_date', crmFilterStartDate.value);
            if (crmFilterEndDate && crmFilterEndDate.value) params.append('end_date', crmFilterEndDate.value);
            if (crmFilterReason && crmFilterReason.value) params.append('reason', crmFilterReason.value);
            if (crmFilterSalesPerson && crmFilterSalesPerson.value) params.append('sales_person', crmFilterSalesPerson.value);
            if (crmSearchInput && crmSearchInput.value) params.append('search', crmSearchInput.value.trim());

            const response = await fetch(`/api/crm-walkin-customers?${params.toString()}`);
            const res = await response.json();

            if (response.ok && res.success) {
                allCrmRecords = res.data || [];
                renderCrmTable();
                updateStats();
            } else {
                showToast(res.message || 'Failed to load CRM records.', 'error');
            }
        } catch (err) {
            showToast('Network error while loading CRM records.', 'error');
        }
    };

    const updateStats = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        let enquiryCount = 0;
        let pricingCount = 0;

        allCrmRecords.forEach(r => {
            if (r.created_at && r.created_at.startsWith(todayStr)) {
                todayCount++;
            }
            if (r.walkout_reason === 'Enquiry Customer') {
                enquiryCount++;
            }
            if (r.walkout_reason === 'Pricing Issue') {
                pricingCount++;
            }
        });

        animateCounter(crmCountTotal, allCrmRecords.length);
        animateCounter(crmCountToday, todayCount);
        animateCounter(crmCountEnquiry, enquiryCount);
        animateCounter(crmCountPricing, pricingCount);
    };

    const animateCounter = (element, targetValue) => {
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
    };

    // --- TABLE RENDERING ---
    const renderCrmTable = () => {
        if (!crmTableBody) return;

        if (allCrmRecords.length === 0) {
            crmTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-on-surface-variant opacity-60">
                        No CRM walk-in entries found matching filters.
                    </td>
                </tr>
            `;
            if (crmCardList) {
                crmCardList.innerHTML = `
                    <div class="px-4 py-10 text-center text-on-surface-variant opacity-60 text-sm bg-white border border-outline-variant rounded-2xl">
                        No CRM walk-in entries found matching filters.
                    </div>
                `;
            }
            return;
        }

        // Render Desktop Rows
        crmTableBody.innerHTML = allCrmRecords.map(item => {
            const cid = item.crm_customer_id || '';
            const editBtn = isAdminOrSuper
                ? `<button onclick="openCrmModal('${cid}')" class="text-secondary hover:text-orange-700 transition-colors p-1.5 rounded-lg hover:bg-orange-50" title="Edit CRM Record"><span class="material-symbols-outlined text-[18px]">edit</span></button>`
                : '';
            const deleteBtn = isAdminOrSuper
                ? `<button onclick="deleteCrmRecord('${cid}')" class="text-error hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Delete CRM Record"><span class="material-symbols-outlined text-[18px]">delete</span></button>`
                : '';

            return `
                <tr class="odd:bg-[#0D70C0]/5 even:bg-white hover:bg-[#0D70C0]/10 transition-colors duration-200 group">
                    <td class="px-6 py-4 font-data-mono text-body-sm text-on-surface-variant whitespace-nowrap">${escapeHtml(item.created_at)}</td>
                    <td class="px-6 py-4 font-bold text-slate-500 whitespace-nowrap">${escapeHtml(cid)}</td>
                    <td class="px-6 py-4 font-bold text-primary hover:underline cursor-pointer whitespace-nowrap" onclick="viewCrmCustomer('${cid}')">
                        ${escapeHtml(item.customer_name)}
                    </td>
                    <td class="px-6 py-4 text-on-surface font-medium whitespace-nowrap">${escapeHtml(item.mobile_number)}</td>
                    <td class="px-6 py-4 text-on-surface whitespace-nowrap max-w-[150px] truncate">${escapeHtml(item.model_item)}</td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">${escapeHtml(item.walkout_reason)}</span></td>
                    <td class="px-6 py-4 text-on-surface-variant whitespace-nowrap">${escapeHtml(item.sales_person)}</td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex justify-end gap-2">
                            <button onclick="viewCrmCustomer('${cid}')" class="text-primary hover:text-blue-800 transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="View Details">
                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            ${editBtn}
                            ${deleteBtn}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Render Mobile Cards
        if (crmCardList) {
            crmCardList.innerHTML = allCrmRecords.map((item, idx) => {
                const cid = item.crm_customer_id || '';
                const editBtnMobile = isAdminOrSuper
                    ? `<button onclick="openCrmModal('${cid}')" class="text-secondary hover:text-orange-700 transition-colors p-2 rounded-lg hover:bg-orange-50" title="Edit Record"><span class="material-symbols-outlined text-[20px]">edit</span></button>`
                    : '';
                const deleteBtnMobile = isAdminOrSuper
                    ? `<button onclick="deleteCrmRecord('${cid}')" class="text-rose-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50" title="Delete Record"><span class="material-symbols-outlined text-[20px]">delete</span></button>`
                    : '';

                return `
                <div class="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
                    <div class="flex items-center justify-between px-4 py-3.5 ${idx % 2 === 0 ? 'bg-[#0D70C0]/5' : 'bg-white'}">
                        <div class="flex items-center gap-3 min-w-0 cursor-pointer" onclick="viewCrmCustomer('${cid}')">
                            <div class="w-9 h-9 rounded-full bg-[#0D70C0]/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                                ${escapeHtml(item.customer_name.charAt(0).toUpperCase())}
                            </div>
                            <div class="min-w-0">
                                <p class="font-bold text-primary hover:underline text-[15px] leading-tight">${escapeHtml(item.customer_name)}</p>
                                <p class="text-xs text-on-surface-variant font-medium mt-0.5">${escapeHtml(item.model_item)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button onclick="viewCrmCustomer('${cid}')"
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

    // --- FORM ACTIONS (ADD/EDIT) ---
    window.openCrmModal = (recordId = null) => {
        if (!crmFormModal) return;

        crmForm.reset();
        clearCrmForm();

        if (recordId) {
            // Edit Mode
            const record = allCrmRecords.find(r => r.crm_customer_id === recordId);
            if (!record) return;

            crmModalTitle.innerHTML = `<span class="material-symbols-outlined text-[#EE8133]">support_agent</span> Modify CRM Customer Record`;
            crmRecordIdInput.value = record.crm_customer_id;
            crmCustomerNameInput.value = record.customer_name;
            crmMobileNumberInput.value = record.mobile_number;
            crmModelItemInput.value = record.model_item;
            crmWalkoutReasonInput.value = record.walkout_reason;
            crmRemarksInput.value = record.remarks;
            crmSalesPersonInput.value = record.sales_person;
        } else {
            // Add Mode
            crmModalTitle.innerHTML = `<span class="material-symbols-outlined text-[#EE8133]">support_agent</span> New CRM Customer Registration`;
            crmRecordIdInput.value = '';
            crmRemarksInput.value = '';
            crmWalkoutReasonInput.value = '';
            crmSalesPersonInput.value = '';
        }

        crmFormModal.classList.remove('hidden');
    };

    window.closeCrmModal = () => {
        if (crmFormModal) crmFormModal.classList.add('hidden');
    };

    window.clearCrmForm = () => {
        crmCustomerNameInput.value = '';
        crmMobileNumberInput.value = '';
        crmModelItemInput.value = '';
        crmWalkoutReasonInput.value = '';
        crmRemarksInput.value = '';
        crmSalesPersonInput.value = '';
        crmCustomerNameInput.classList.remove('border-rose-500');
        crmMobileNumberInput.classList.remove('border-rose-500');
        crmModelItemInput.classList.remove('border-rose-500');
        crmWalkoutReasonInput.classList.remove('border-rose-500');
        crmSalesPersonInput.classList.remove('border-rose-500');
    };

    // --- FORM SUBMIT & VALIDATION ---
    crmForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const recordId = crmRecordIdInput.value;
        const name = crmCustomerNameInput.value.trim();
        const mobile = crmMobileNumberInput.value.trim();
        const model = crmModelItemInput.value.trim();
        const reason = crmWalkoutReasonInput.value.trim();
        const remarks = crmRemarksInput.value.trim();
        const salesperson = crmSalesPersonInput.value.trim();

        // Local Validations
        let valid = true;

        if (!name) {
            crmCustomerNameInput.classList.add('border-rose-500');
            valid = false;
        } else {
            crmCustomerNameInput.classList.remove('border-rose-500');
        }

        if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            crmMobileNumberInput.classList.add('border-rose-500');
            valid = false;
        } else {
            crmMobileNumberInput.classList.remove('border-rose-500');
        }

        if (!model) {
            crmModelItemInput.classList.add('border-rose-500');
            valid = false;
        } else {
            crmModelItemInput.classList.remove('border-rose-500');
        }

        if (!reason) {
            crmWalkoutReasonInput.classList.add('border-rose-500');
            valid = false;
        } else {
            crmWalkoutReasonInput.classList.remove('border-rose-500');
        }

        if (!salesperson) {
            crmSalesPersonInput.classList.add('border-rose-500');
            valid = false;
        } else {
            crmSalesPersonInput.classList.remove('border-rose-500');
        }

        if (remarks.length > 500) {
            crmRemarksInput.classList.add('border-rose-500');
            valid = false;
        } else {
            crmRemarksInput.classList.remove('border-rose-500');
        }

        if (!valid) {
            showToast('Please correct validation errors on the form.', 'error');
            return;
        }

        window.showLoading('Saving CRM record...');
        try {
            const url = recordId ? `/api/crm-walkin-customers/${recordId}` : '/api/crm-walkin-customers';
            const method = recordId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: name,
                    mobile_number: mobile,
                    model_item: model,
                    walkout_reason: reason,
                    remarks: remarks,
                    sales_person: salesperson
                })
            });

            const res = await response.json();
            if (response.ok && res.success) {
                showToast(res.message || 'CRM record saved successfully.', 'success');
                closeCrmModal();
                fetchCrmData();
            } else {
                showToast(res.message || 'Failed to save record.', 'error');
            }
        } catch (err) {
            showToast('Connection error while saving record.', 'error');
        } finally {
            window.hideLoading();
        }
    });

    // --- VIEW RECORD DETAILS ---
    window.viewCrmCustomer = (recordId) => {
        if (!crmDetailModal) return;

        const record = allCrmRecords.find(r => r.crm_customer_id === recordId);
        if (!record) return;

        detailInitial.textContent = (record.customer_name || 'C').charAt(0).toUpperCase();
        detailName.textContent = record.customer_name;
        detailId.textContent = record.crm_customer_id;
        detailMobile.textContent = record.mobile_number;
        detailModel.textContent = record.model_item;
        detailReason.textContent = record.walkout_reason;
        detailSalesperson.textContent = record.sales_person;
        detailCreatedby.textContent = record.created_by || '—';
        detailCreatedat.textContent = formatDateTime(record.created_at);
        detailUpdatedat.textContent = formatDateTime(record.updated_at);
        detailRemarks.textContent = record.remarks || 'None';

        // Configure buttons based on permissions
        if (isAdminOrSuper) {
            if (btnEditFromModal) {
                btnEditFromModal.classList.remove('hidden');
                btnEditFromModal.onclick = () => {
                    closeCrmDetailModal();
                    openCrmModal(recordId);
                };
            }
            if (btnDeleteFromModal) {
                btnDeleteFromModal.classList.remove('hidden');
                btnDeleteFromModal.onclick = () => {
                    closeCrmDetailModal();
                    deleteCrmRecord(recordId);
                };
            }
        } else {
            if (btnEditFromModal) btnEditFromModal.classList.add('hidden');
            if (btnDeleteFromModal) btnDeleteFromModal.classList.add('hidden');
        }

        crmDetailModal.classList.remove('hidden');
    };

    window.closeCrmDetailModal = () => {
        if (crmDetailModal) crmDetailModal.classList.add('hidden');
    };

    // --- DELETE RECORD ---
    window.deleteCrmRecord = async (recordId) => {
        if (!isAdminOrSuper) {
            showToast('Access denied: Admin permissions required.', 'error');
            return;
        }

        const confirmed = await window.showConfirm(
            `Are you sure you want to permanently delete CRM record ${recordId}? This action cannot be undone.`,
            'danger',
            'Delete CRM Record'
        );
        if (!confirmed) return;

        window.showLoading('Deleting CRM record...');
        try {
            const response = await fetch(`/api/crm-walkin-customers/${recordId}`, { method: 'DELETE' });
            const res = await response.json();

            if (response.ok && res.success) {
                showToast('CRM record deleted successfully.', 'success');
                fetchCrmData();
            } else {
                showToast(res.message || 'Failed to delete CRM record.', 'error');
            }
        } catch (err) {
            showToast('Connection error while deleting.', 'error');
        } finally {
            window.hideLoading();
        }
    };

    // --- FILTER TRIGGERS ---
    let searchDebounce;
    if (crmSearchInput) {
        crmSearchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(fetchCrmData, 300);
        });
    }

    if (crmFilterStartDate) crmFilterStartDate.addEventListener('change', fetchCrmData);
    if (crmFilterEndDate) crmFilterEndDate.addEventListener('change', fetchCrmData);
    if (crmFilterReason) crmFilterReason.addEventListener('change', fetchCrmData);
    
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            if (crmSearchInput) crmSearchInput.value = '';
            if (crmFilterStartDate) crmFilterStartDate.value = '';
            if (crmFilterEndDate) crmFilterEndDate.value = '';
            if (crmFilterReason) crmFilterReason.value = '';
            const salespersonFilterInput = document.getElementById('crmFilterSalesPerson');
            if (salespersonFilterInput) salespersonFilterInput.value = '';
            fetchCrmData();
        });
    }

    // --- POPUP MODAL FUNCTIONALITY ---
    window.openPopupModal = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;

        // Reset search input if searchable
        const searchInput = modal.querySelector(`input[type="text"]`);
        if (searchInput) {
            searchInput.value = '';
            window.filterPopupOptions(id, '');
        }

        // Highlight selected option
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

        modal.classList.remove('hidden');
        modal.offsetHeight; // Reflow
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');

        const content = modal.querySelector('.popup-modal-content');
        if (content) {
            content.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
            content.classList.add('translate-y-0', 'sm:translate-y-0', 'sm:scale-100');
        }

        setTimeout(() => {
            if (searchInput) searchInput.focus();
        }, 50);

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
            input.classList.remove('border-rose-500');
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        window.closePopupModal(id);
    };

    window.filterPopupOptions = (id, query) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;

        const list = modal.querySelector('.option-list') || modal.querySelector('.flex-col');
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

    // Close modals on clicking outside of dialog content
    document.querySelectorAll('.popup-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                const id = overlay.id.replace('modal-', '');
                window.closePopupModal(id);
            }
        });
    });

    const escapeHtml = (text) => {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    };

    // Initialize on load
    fetchCrmData();
});
