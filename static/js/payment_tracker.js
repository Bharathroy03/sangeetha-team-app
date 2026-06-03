const initApp = () => {
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

    // Elements
    const paymentForm = document.getElementById('paymentForm');
    const btnClearForm = document.getElementById('btnClearForm');
    const btnCancelForm = document.getElementById('btnCancelForm');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogoutMobile = document.getElementById('btnLogoutMobile');
    const btnScanBarcode = document.getElementById('btnScanBarcode');

    // Inputs
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

    // Conditional Sections
    const pendingFromSection = document.getElementById('pendingFromSection');
    const pendingPersonNameSection = document.getElementById('pendingPersonNameSection');
    const dueDateSection = document.getElementById('dueDateSection');

    // App State
    let allPayments = [];
    let activeTab = 'all'; // all, customer, employee
    let editMode = false;
    let editPaymentId = null;

    // Barcode scanner variables
    let html5QrCode = null;
    let isScannerRunning = false;

    // --- MOBILE MENU TOGGLE ---
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('side-nav');
    const overlay = document.getElementById('sidebar-overlay');
    if (mobileToggle && sidebar && overlay) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }

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
    // --- LOGOUT ACTION ---
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
    if (btnLogout) btnLogout.addEventListener('click', logoutAction);
    if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', logoutAction);

    // --- TAB NAVIGATION SWITCHER ---
    window.switchTrackerTab = (tab) => {
        activeTab = tab;
        const tabs = {
            'all': { btn: 'tabBtnAll', content: 'tabContentAll' },
            'customer': { btn: 'tabBtnCustomer', content: 'tabContentCustomer' },
            'employee': { btn: 'tabBtnEmployee', content: 'tabContentEmployee' }
        };

        Object.keys(tabs).forEach(t => {
            const btnEl = document.getElementById(tabs[t].btn);
            const contentEl = document.getElementById(tabs[t].content);
            if (t === tab) {
                btnEl.classList.add('active');
                contentEl.classList.remove('hidden');
            } else {
                btnEl.classList.remove('active');
                contentEl.classList.add('hidden');
            }
        });
        
        fetchPayments();
    };

    // --- POPUP SELECTION DIALOGS ---
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
                if (checkIcon) {
                    checkIcon.remove();
                }
            }
        });

        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(0) scale(1)';

        // Focus search input only if present
        setTimeout(() => {
            if (searchInput) {
                searchInput.focus();
            }
        }, 50);
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
            // Trigger change event to fire calculations if needed
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
            if (val.includes(normalized)) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        });
    };

    // Close modals on Esc keypress
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.popup-modal-overlay:not(.hidden)').forEach(modal => {
                const id = modal.id.replace('modal-', '');
                if (id === 'barcode') {
                    closeBarcodeScanner();
                } else if (id === 'payment-detail') {
                    closeDetailModal();
                } else if (id === 'partial-payment') {
                    closePartialModal();
                } else {
                    closePopupModal(id);
                }
            });
        }
    });

    // --- AUTO CALCULATION LOGIC ---
    function runCalculations(keepExistingStatus = false) {
        const totalVal = parseFloat(totalBillInput.value) || 0;
        const receivedVal = parseFloat(amountReceivedInput.value) || 0;

        // Pending Amount = Total - Received
        const pendingVal = Math.max(0, totalVal - receivedVal);
        pendingAmountInput.value = pendingVal.toFixed(2);

        if (pendingVal <= 0) {
            // Fully Paid
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
            pendingPersonNameSection.classList.add('hidden');
            dueDateSection.classList.add('hidden');
        } else {
            // Partially Paid / Unsettled
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
            pendingPersonInput.value = customerNameInput.value;
        } else {
            pendingPersonNameSection.classList.add('hidden');
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

    // --- FORM ACTIONS ---
    const resetFormState = () => {
        paymentForm.reset();
        editMode = false;
        editPaymentId = null;
        document.getElementById('formTitle').innerHTML = '<span class="material-symbols-outlined text-[#EE8133] text-[22px] font-bold">add_shopping_cart</span>Record Sales Payment';
        
        // Hide conditional sections
        pendingFromSection.classList.add('hidden');
        pendingPersonNameSection.classList.add('hidden');
        dueDateSection.classList.add('hidden');

        // Clear error classes
        const inputs = [customerNameInput, mobileInput, itemModelInput, imeiInput, salesPersonInput, paymentModeInput, totalBillInput, amountReceivedInput, pendingFromInput, dueDateInput];
        inputs.forEach(input => {
            if (input) input.classList.remove('border-rose-500', 'ring-rose-500');
        });
    };
    if (btnClearForm) btnClearForm.addEventListener('click', resetFormState);
    if (btnCancelForm) btnCancelForm.addEventListener('click', resetFormState);

    // Form validation and submit
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear error classes
            const inputs = [customerNameInput, mobileInput, itemModelInput, imeiInput, salesPersonInput, paymentModeInput, totalBillInput, amountReceivedInput, pendingFromInput, dueDateInput];
            inputs.forEach(input => {
                if (input) input.classList.remove('border-rose-500', 'ring-rose-500');
            });

            // Frontend Validations
            let valid = true;
            const cName = customerNameInput.value.trim();
            const mobile = mobileInput.value.trim();
            const imei = imeiInput.value.trim();
            const totalVal = parseFloat(totalBillInput.value) || 0;
            const receivedVal = parseFloat(amountReceivedInput.value) || 0;

            if (!cName || cName.length > 100) {
                customerNameInput.classList.add('border-rose-500');
                valid = false;
            }
            if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
                mobileInput.classList.add('border-rose-500');
                valid = false;
            }
            if (imei && (imei.length !== 15 || !/^\d+$/.test(imei))) {
                imeiInput.classList.add('border-rose-500');
                valid = false;
            }
            if (totalVal <= 0) {
                totalBillInput.classList.add('border-rose-500');
                valid = false;
            }
            if (receivedVal < 0 || receivedVal > totalVal) {
                amountReceivedInput.classList.add('border-rose-500');
                valid = false;
            }

            const pendingVal = totalVal - receivedVal;
            if (pendingVal > 0) {
                if (!pendingFromInput.value || pendingFromInput.value === 'No Pending') {
                    pendingFromInput.classList.add('border-rose-500');
                    valid = false;
                }
                if (!dueDateInput.value) {
                    dueDateInput.classList.add('border-rose-500');
                    valid = false;
                }
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

    // --- BARCODE SCANNER IMPLEMENTATION ---
    const startScanning = async () => {
        const modal = document.getElementById('modal-barcode');
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(0) scale(1)';

        const errorDiv = document.getElementById('scannerErrorMessage');
        if (errorDiv) errorDiv.classList.add('hidden');

        try {
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode('interactive-reader');
            }

            const config = {
                fps: 10,
                qrbox: (w, h) => ({ width: Math.min(Math.floor(w * 0.85), 260), height: 100 }),
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                async (decodedText) => {
                    // verify imei
                    try {
                        const res = await fetch('/api/verify-imei', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imei: decodedText.trim() })
                        });
                        const verification = await res.json();
                        if (res.ok && verification.success) {
                            imeiInput.value = decodedText.trim();
                            imeiInput.classList.remove('border-rose-500');
                            closeBarcodeScanner();
                            showToast('IMEI verified successfully: ' + decodedText.trim(), 'success');
                        } else {
                            if (errorDiv) {
                                errorDiv.textContent = verification.message || 'Scanned IMEI is invalid.';
                                errorDiv.classList.remove('hidden');
                            }
                        }
                    } catch (err) {
                        if (errorDiv) {
                            errorDiv.textContent = 'Verification error.';
                            errorDiv.classList.remove('hidden');
                        }
                    }
                },
                (errorMessage) => {}
            );
            isScannerRunning = true;
        } catch (err) {
            isScannerRunning = false;
            if (errorDiv) {
                errorDiv.textContent = 'Camera unavailable: ' + err;
                errorDiv.classList.remove('hidden');
            }
        }
    };

    const closeBarcodeScanner = async () => {
        const modal = document.getElementById('modal-barcode');
        if (!modal) return;

        modal.style.opacity = '0';
        modal.querySelector('.popup-modal-content').style.transform = 'translateY(100%) scale(0.95)';
        
        if (html5QrCode && isScannerRunning) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (e) {}
            html5QrCode = null;
            isScannerRunning = false;
        }
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        }, 300);
    };

    if (btnScanBarcode) btnScanBarcode.addEventListener('click', startScanning);
    window.closeBarcodeModal = closeBarcodeScanner;

    // --- FETCH PAYMENTS & STATISTICS ---
    async function fetchPayments() {
        const start = document.getElementById('filterStartDate').value;
        const end = document.getElementById('filterEndDate').value;
        const mode = document.getElementById('filterMode').value;
        const status = document.getElementById('filterStatus').value;
        const settlement = document.getElementById('filterSettlement').value;
        const pendingFrom = document.getElementById('filterPendingFrom').value;
        const salesperson = document.getElementById('filterSalesperson').value;
        const search = document.getElementById('filterSearch').value;

        // Build Query URL
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
            // Load summaries
            const summaryRes = await fetch('/api/payment-summary');
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                if (summaryData.success && summaryData.summary) {
                    updateSummaryCards(summaryData.summary);
                }
            }

            // Load records
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
        setVal('cardTotalSales', `₹${Math.round(s.total_sales_amount).toLocaleString()}`);
        setVal('cardCashSales', `₹${Math.round(s.cash_sales).toLocaleString()}`);
        setVal('cardCardSales', `₹${Math.round(s.card_sales).toLocaleString()}`);
        setVal('cardEWalletSales', `₹${Math.round(s.ewallet_sales).toLocaleString()}`);
        setVal('cardTotalReceived', `₹${Math.round(s.total_received).toLocaleString()}`);
        setVal('cardTotalPending', `₹${Math.round(s.total_pending).toLocaleString()}`);
        setVal('cardCustomerPending', `₹${Math.round(s.customer_pending).toLocaleString()}`);
        setVal('cardEmployeePending', `₹${Math.round(s.employee_pending).toLocaleString()}`);
    }

    function renderAllTables() {
        if (activeTab === 'all') {
            renderMainTable();
        } else if (activeTab === 'customer') {
            renderCustomerDebtTable();
        } else if (activeTab === 'employee') {
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
            body.innerHTML = `<tr><td colspan="11" class="px-6 py-10 text-center text-slate-400 font-medium bg-slate-50/50">No payment records found matching the active filters.</td></tr>`;
            cardsContainer.innerHTML = `<div class="p-6 text-center text-slate-400 bg-slate-50 border border-[#E5E7EB] rounded-2xl">No records matching active filters.</div>`;
            return;
        }

        allPayments.forEach(p => {
            const total = parseFloat(p.total_bill_amount) || 0;
            const received = parseFloat(p.amount_received) || 0;
            const pending = parseFloat(p.pending_amount) || 0;

            const dateStr = p.created_at ? p.created_at.split(' ')[0] : '--';
            
            // Build Status Tags
            let statusTag = '';
            if (p.payment_status === 'Fully Paid') {
                statusTag = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">Paid</span>`;
            } else if (p.payment_status === 'Partially Paid') {
                statusTag = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-amber-700 border border-yellow-200">Partial</span>`;
            } else if (p.payment_status === 'Overdue') {
                statusTag = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Overdue</span>`;
            } else {
                statusTag = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Pending</span>`;
            }

            // --- Desktop Row ---
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

            // --- Mobile Card ---
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
                    <div class="flex justify-between gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Pending From:</span><span class="text-right break-words max-w-[65%]">${escapeHtml(p.pending_from)}</span></div>
                    <div class="flex justify-between items-center gap-4"><span class="text-slate-400 font-medium whitespace-nowrap">Status:</span><span class="text-right">${statusTag}</span></div>
                </div>
                <div class="flex flex-wrap items-center justify-start sm:justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                    <button onclick="viewPaymentDetail('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">visibility</span> View Details</button>
                    <button onclick="editPaymentDetail('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-amber-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">edit</span> Edit</button>
                    ${pending > 0 ? `
                        <button onclick="openPartialPaymentModal('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">add_card</span> Partial</button>
                        <button onclick="markAsFullyPaid('${p.payment_id}')" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-green-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">check_circle</span> Mark Paid</button>
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
                    <button onclick="openPartialPaymentModal('${p.payment_id}')" class="px-3 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">add_card</span> Collect Partial</button>
                    <button onclick="markAsFullyPaid('${p.payment_id}')" class="px-3 py-1.5 border border-green-200 text-green-700 bg-green-50/50 hover:bg-green-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">check_circle</span> Settle All</button>
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
            body.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 font-medium bg-slate-50/50">No employee pending amounts found.</td></tr>`;
            return;
        }

        // Aggregate by salesperson
        const aggregated = {};
        employeeDebts.forEach(p => {
            const name = p.pending_person_name || p.sales_person;
            if (!aggregated[name]) {
                aggregated[name] = {
                    name: name,
                    cases: 0,
                    totalPending: 0.0,
                    oldestDue: '9999-12-31'
                };
            }
            aggregated[name].cases++;
            aggregated[name].totalPending += parseFloat(p.pending_amount) || 0;
            if (p.due_date && p.due_date < aggregated[name].oldestDue) {
                aggregated[name].oldestDue = p.due_date;
            }
        });

        Object.values(aggregated).forEach(emp => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 border-b border-slate-100 transition-colors';
            
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = emp.oldestDue < todayStr;
            const dueBadge = isOverdue 
                ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Overdue</span>`
                : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Active</span>`;

            tr.innerHTML = `
                <td class="px-4 py-3.5 font-bold text-slate-800">${escapeHtml(emp.name)}</td>
                <td class="px-4 py-3.5 text-center font-bold">${emp.cases} cases</td>
                <td class="px-4 py-3.5 text-right font-bold text-rose-600">₹${emp.totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3.5 font-bold text-slate-800 font-data-mono">${emp.oldestDue === '9999-12-31' ? '--' : emp.oldestDue}</td>
                <td class="px-4 py-3.5">${dueBadge}</td>
            `;
            body.appendChild(tr);
        });
    }

    // --- VIEW DETAILS MODAL LOGIC ---
    window.viewPaymentDetail = async (id) => {
        const modal = document.getElementById('modal-payment-detail');
        if (!modal) return;

        const payment = allPayments.find(p => p.payment_id === id);
        if (!payment) return;

        // Populate fields
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

        // Statuses
        document.getElementById('detStatuses').innerHTML = `<strong>Payment:</strong> ${payment.payment_status}<br><strong>Settlement:</strong> ${payment.settlement_status}`;
        document.getElementById('detRemarks').textContent = payment.remarks || 'No notes.';

        // Render History List
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

        // Open modal
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
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    // --- EDIT TRANSACTION RECORD ---
    window.editPaymentDetail = (id) => {
        const payment = allPayments.find(p => p.payment_id === id);
        if (!payment) return;

        // Fill Form
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

        // Trigger updates
        runCalculations(true);

        // Scroll to form
        document.getElementById('view-payment-form-section').scrollIntoView({ behavior: 'smooth' });
        showToast(`Loaded ${payment.payment_id} details for editing.`, 'success');
    };

    // --- RECORD PARTIAL PAYMENT ACTION ---
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
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
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

    // --- MARK RECORD AS FULLY PAID ---
    window.markAsFullyPaid = async (id) => {
        const payment = allPayments.find(p => p.payment_id === id);
        if (!payment) return;

        const confirmVal = await window.showConfirm(`Are you sure you want to mark payment ID ${payment.payment_id} for ${payment.customer_name} as Fully Paid? This will settle the remaining balance of ₹${(parseFloat(payment.pending_amount) || 0).toLocaleString()}.`, 'confirm', 'Settle Payment Record');
        if (!confirmVal) return;

        try {
            window.showLoading('Settling Payment Record...');
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

    // --- DELETE PAYMENT RECORD ---
    window.deletePaymentDetail = async (id) => {
        const confirmVal = await window.showConfirm(`Are you sure you want to delete payment record ${id}? This action is permanent and cannot be undone.`, 'danger', 'Delete Payment Record');
        if (!confirmVal) return;

        try {
            window.showLoading('Deleting Payment Record...');
            const response = await fetch(`/api/payments/${id}`, {
                method: 'DELETE'
            });
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

    // --- FILTER TRIGGERS ---
    const filters = ['filterStartDate', 'filterEndDate', 'filterMode', 'filterStatus', 'filterSettlement', 'filterPendingFrom', 'filterSalesperson'];
    filters.forEach(fid => {
        const el = document.getElementById(fid);
        if (el) el.addEventListener('change', fetchPayments);
    });

    const searchInput = document.getElementById('filterSearch');
    if (searchInput) {
        // debounce search input
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchPayments, 350);
        });
    }

    const btnClearDate = document.getElementById('btnClearDateFilters');
    if (btnClearDate) {
        btnClearDate.addEventListener('click', () => {
            document.getElementById('filterStartDate').value = '';
            document.getElementById('filterEndDate').value = '';
            fetchPayments();
        });
    }

    // --- INITIAL LOADING ---
    fetchPayments();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
