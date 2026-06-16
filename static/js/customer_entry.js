/* ============================================================
   customer_entry.js  —  Wizard Popup Redesign
   All conditional details collected via guided popups.
   Hidden inputs feed the existing backend unchanged.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ── DOM refs ────────────────────────────────────────────── */
    const customerForm          = document.getElementById('customerForm');
    const transactionModeInput  = document.getElementById('transaction_mode');
    const exchangeStatusInput   = document.getElementById('exchange_status');
    const salesPersonInput      = document.getElementById('sales_person');
    const imeiInput             = document.getElementById('imei_number');
    const mobileInput           = document.getElementById('mobile_number');
    const customerNameInput     = document.getElementById('customer_name');
    const remarksInput          = document.getElementById('remarks');

    // Hidden inputs (values set by wizard saves)
    const h_financeProvider    = document.getElementById('finance_provider');
    const h_downPaymentMode    = document.getElementById('down_payment_mode');
    const h_downPaymentValue   = document.getElementById('down_payment_value');
    const h_cashAmount         = document.getElementById('cash_amount');
    const h_cardAmount         = document.getElementById('card_amount');
    const h_ewalletAmount      = document.getElementById('ewallet_amount');
    const h_totalReceived      = document.getElementById('total_amount_received');
    const h_exchangeBrand      = document.getElementById('exchange_brand');
    const h_exchangeValue      = document.getElementById('exchange_value');

    // Wizard completion flags
    let financeComplete  = false;
    let paymentComplete  = false;
    let exchangeComplete = false;

    /* ── Utility: format rupees ──────────────────────────────── */
    const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    /* ── Number input restrictions ───────────────────────────── */
    const restrictToDigits = (el) => {
        if (!el) return;
        el.addEventListener('keypress', (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); });
        el.addEventListener('input',    (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); });
    };
    const restrictToFloat = (el) => {
        if (!el) return;
        el.addEventListener('keypress', (e) => { if (!/[0-9.]/.test(e.key)) e.preventDefault(); });
        el.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9.]/g, '');
            const dots = val.split('.');
            if (dots.length > 2) val = dots[0] + '.' + dots.slice(1).join('');
            e.target.value = val;
        });
    };
    restrictToDigits(mobileInput);
    // restrictToDigits(imeiInput);

    restrictToFloat(document.getElementById('wiz_down_payment_value'));
    restrictToFloat(document.getElementById('wiz_cash_amount'));
    restrictToFloat(document.getElementById('wiz_card_amount'));
    restrictToFloat(document.getElementById('wiz_ewallet_amount'));
    restrictToFloat(document.getElementById('wiz_exchange_value'));

    /* Auto-capitalize name */
    if (customerNameInput) {
        customerNameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            e.target.value = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        });
    }

    /* ══════════════════════════════════════════════════════════
       GENERIC POPUP MODAL (existing simple selectors)
    ══════════════════════════════════════════════════════════ */
    window.openPopupModal = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal) return;
        const searchInput = modal.querySelector('input[type="text"]');
        if (searchInput) { searchInput.value = ''; window.filterPopupOptions(id, ''); }
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        const content = modal.querySelector('.popup-modal-content');
        if (content) {
            content.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
            content.classList.add('translate-y-0', 'sm:translate-y-0', 'sm:scale-100');
        }
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
        setTimeout(() => modal.classList.add('hidden'), 300);
        document.removeEventListener('keydown', handlePopupEscKey);
    };

    const handlePopupEscKey = (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('[id^="modal-"]:not(.hidden)').forEach(modal => {
                window.closePopupModal(modal.id.replace('modal-', ''));
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
        const cleanQuery = query.toLowerCase().trim();
        list.querySelectorAll('.option-item').forEach(item => {
            item.classList.toggle('hidden', !item.textContent.toLowerCase().includes(cleanQuery));
        });
    };

    document.querySelectorAll('.popup-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) window.closePopupModal(overlay.id.replace('modal-', ''));
        });
    });

    /* ══════════════════════════════════════════════════════════
       WIZARD MODALS — open / close
    ══════════════════════════════════════════════════════════ */
    const openWizardModal = (id) => {
        const overlay = document.getElementById(`modal-${id}`);
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.offsetHeight;
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        const content = overlay.querySelector('.wizard-modal-content');
        if (content) {
            content.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
            content.classList.add('translate-y-0', 'sm:translate-y-0', 'sm:scale-100');
        }
    };

    window.closeWizardModal = (id, reset = false) => {
        const overlay = document.getElementById(`modal-${id}`);
        if (!overlay) return;
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        const content = overlay.querySelector('.wizard-modal-content');
        if (content) {
            content.classList.remove('translate-y-0', 'sm:translate-y-0', 'sm:scale-100');
            content.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
        }
        setTimeout(() => overlay.classList.add('hidden'), 320);
    };

    /* ══════════════════════════════════════════════════════════
       WIZ-OPTION SELECTION (radio-style tiles)
    ══════════════════════════════════════════════════════════ */
    window.selectWizOption = (btn) => {
        const field = btn.dataset.field;
        // Deselect all in same field group
        btn.closest('[id]')?.querySelectorAll(`.wiz-option[data-field="${field}"]`).forEach(b => b.classList.remove('selected'));
        // Also search parent container
        document.querySelectorAll(`.wiz-option[data-field="${field}"]`).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateFinanceProgress();
    };

    const getWizValue = (field) => {
        const selected = document.querySelector(`.wiz-option.selected[data-field="${field}"]`);
        return selected ? selected.dataset.value : '';
    };

    /* ══════════════════════════════════════════════════════════
       TRANSACTION MODE SELECTION → open wizard
    ══════════════════════════════════════════════════════════ */
    window.selectTransactionMode = (mode) => {
        // Set the visible input
        if (transactionModeInput) {
            transactionModeInput.value = mode;
            transactionModeInput.classList.remove('border-rose-500');
        }
        // Clear previous payment data when switching modes
        clearFinanceSummary();
        clearPaymentSummary();
        financeComplete = false;
        paymentComplete = false;

        window.closePopupModal('transaction_mode');

        setTimeout(() => {
            if (mode === 'Finance') {
                resetFinanceWizard();
                openWizardModal('finance-details');
            } else if (mode === 'Non-Finance') {
                resetPaymentWizard();
                openWizardModal('payment-details');
            }
        }, 320);
    };

    /* ══════════════════════════════════════════════════════════
       EXCHANGE STATUS SELECTION → open wizard or clear
    ══════════════════════════════════════════════════════════ */
    window.selectExchangeStatus = (status) => {
        if (exchangeStatusInput) {
            exchangeStatusInput.value = status;
            exchangeStatusInput.classList.remove('border-rose-500');
        }
        window.closePopupModal('exchange_status');

        if (status === 'Yes') {
            setTimeout(() => {
                resetExchangeWizard();
                openWizardModal('exchange-details');
            }, 320);
        } else {
            // No exchange — clear any existing summary
            clearExchangeSummary();
            exchangeComplete = false;
            h_exchangeBrand.value = '';
            h_exchangeValue.value = '';
        }
    };

    /* ══════════════════════════════════════════════════════════
       FINANCE WIZARD
    ══════════════════════════════════════════════════════════ */
    const resetFinanceWizard = () => {
        document.querySelectorAll('.wiz-option[data-field="finance_provider"]').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('.wiz-option[data-field="down_payment_mode"]').forEach(b => b.classList.remove('selected'));
        const dpv = document.getElementById('wiz_down_payment_value');
        if (dpv) dpv.value = '';
        updateFinanceProgress();

        // Pre-select existing values when editing
        const prevProvider = h_financeProvider.value;
        const prevMode     = h_downPaymentMode.value;
        const prevVal      = h_downPaymentValue.value;
        if (prevProvider) {
            const btn = document.querySelector(`.wiz-option[data-field="finance_provider"][data-value="${prevProvider}"]`);
            if (btn) btn.classList.add('selected');
        }
        if (prevMode) {
            const btn = document.querySelector(`.wiz-option[data-field="down_payment_mode"][data-value="${prevMode}"]`);
            if (btn) btn.classList.add('selected');
        }
        if (prevVal && dpv) dpv.value = prevVal;
        updateFinanceProgress();
    };

    window.updateFinanceProgress = () => {
        const fp  = getWizValue('finance_provider');
        const dpm = getWizValue('down_payment_mode');
        const dpv = (document.getElementById('wiz_down_payment_value')?.value || '').trim();
        const filled = [fp, dpm, dpv].filter(Boolean).length;
        const bar = document.getElementById('financeProgressBar');
        if (bar) bar.style.width = `${Math.round((filled / 3) * 100)}%`;
    };

    window.saveFinanceDetails = () => {
        const provider = getWizValue('finance_provider');
        const dpMode   = getWizValue('down_payment_mode');
        const dpVal    = parseFloat(document.getElementById('wiz_down_payment_value')?.value || '') || 0;

        if (!provider) { if (window.showToast) window.showToast('Please select a Finance Provider.', 'error'); return; }
        if (!dpMode)   { if (window.showToast) window.showToast('Please select a Down Payment Mode.', 'error'); return; }
        if (dpVal <= 0){ if (window.showToast) window.showToast('Please enter a valid Down Payment Value.', 'error'); return; }

        // Set hidden inputs
        h_financeProvider.value  = provider;
        h_downPaymentMode.value  = dpMode;
        h_downPaymentValue.value = dpVal;
        // Clear non-finance fields
        h_cashAmount.value = h_cardAmount.value = h_ewalletAmount.value = h_totalReceived.value = '';

        financeComplete = true;
        window.closeWizardModal('finance-details');
        renderFinanceSummary(provider, dpMode, dpVal);
        if (window.showToast) window.showToast('Finance details saved!', 'success');
    };

    const renderFinanceSummary = (provider, dpMode, dpVal) => {
        clearFinanceSummary();
        const container = document.getElementById('summaryCardsContainer');
        const section   = document.getElementById('selectedDetailsSummary');
        if (!container) return;

        const card = document.createElement('div');
        card.id = 'summaryCard-finance';
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="card-icon bg-blue-100">
                <span class="material-symbols-outlined text-[18px] text-[#0D70C0]">account_balance</span>
            </div>
            <div class="card-body">
                <div class="card-title">💰 Finance Details</div>
                <div class="card-detail">${provider}</div>
                <div class="card-detail text-slate-500">${dpMode} &nbsp;·&nbsp; ${fmt(dpVal)}</div>
            </div>
            <button class="card-edit-btn" onclick="editFinanceDetails()" title="Edit Finance Details">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>`;
        container.appendChild(card);
        if (section) section.classList.remove('hidden');
    };

    const clearFinanceSummary = () => {
        document.getElementById('summaryCard-finance')?.remove();
        checkSummaryVisibility();
    };

    window.editFinanceDetails = () => {
        resetFinanceWizard();
        openWizardModal('finance-details');
    };

    /* ══════════════════════════════════════════════════════════
       PAYMENT WIZARD (Non-Finance)
    ══════════════════════════════════════════════════════════ */
    const resetPaymentWizard = () => {
        ['wiz_cash_amount','wiz_card_amount','wiz_ewallet_amount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        // Pre-fill existing values when editing
        if (h_cashAmount.value)    document.getElementById('wiz_cash_amount').value    = h_cashAmount.value;
        if (h_cardAmount.value)    document.getElementById('wiz_card_amount').value    = h_cardAmount.value;
        if (h_ewalletAmount.value) document.getElementById('wiz_ewallet_amount').value = h_ewalletAmount.value;
        updatePaymentTotal();
    };

    window.updatePaymentTotal = () => {
        const cash    = parseFloat(document.getElementById('wiz_cash_amount')?.value    || 0) || 0;
        const card    = parseFloat(document.getElementById('wiz_card_amount')?.value    || 0) || 0;
        const ewallet = parseFloat(document.getElementById('wiz_ewallet_amount')?.value || 0) || 0;
        const total   = cash + card + ewallet;
        const el = document.getElementById('wiz_payment_total_display');
        if (el) el.textContent = fmt(total);
    };

    window.savePaymentDetails = () => {
        const cash    = parseFloat(document.getElementById('wiz_cash_amount')?.value    || 0) || 0;
        const card    = parseFloat(document.getElementById('wiz_card_amount')?.value    || 0) || 0;
        const ewallet = parseFloat(document.getElementById('wiz_ewallet_amount')?.value || 0) || 0;
        const total   = cash + card + ewallet;
        if (total <= 0) { if (window.showToast) window.showToast('Please enter at least one payment amount.', 'error'); return; }

        h_cashAmount.value    = cash;
        h_cardAmount.value    = card;
        h_ewalletAmount.value = ewallet;
        h_totalReceived.value = total;
        // Clear finance fields
        h_financeProvider.value = h_downPaymentMode.value = h_downPaymentValue.value = '';

        paymentComplete = true;
        window.closeWizardModal('payment-details');
        renderPaymentSummary(cash, card, ewallet, total);
        if (window.showToast) window.showToast('Payment details saved!', 'success');
    };

    const renderPaymentSummary = (cash, card, ewallet, total) => {
        clearPaymentSummary();
        const container = document.getElementById('summaryCardsContainer');
        const section   = document.getElementById('selectedDetailsSummary');
        if (!container) return;

        const card2 = document.createElement('div');
        card2.id = 'summaryCard-payment';
        card2.className = 'summary-card';
        card2.innerHTML = `
            <div class="card-icon bg-emerald-100">
                <span class="material-symbols-outlined text-[18px] text-emerald-600">money</span>
            </div>
            <div class="card-body">
                <div class="card-title">💳 Payment Split</div>
                <div class="card-detail flex gap-3 flex-wrap">
                    ${cash    > 0 ? `<span>Cash: ${fmt(cash)}</span>`    : ''}
                    ${card    > 0 ? `<span>Card: ${fmt(card)}</span>`    : ''}
                    ${ewallet > 0 ? `<span>E-Wallet: ${fmt(ewallet)}</span>` : ''}
                </div>
                <div class="card-detail font-extrabold text-emerald-700 mt-1">Total: ${fmt(total)}</div>
            </div>
            <button class="card-edit-btn" onclick="editPaymentDetails()" title="Edit Payment Details">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>`;
        container.appendChild(card2);
        if (section) section.classList.remove('hidden');
    };

    const clearPaymentSummary = () => {
        document.getElementById('summaryCard-payment')?.remove();
        checkSummaryVisibility();
    };

    window.editPaymentDetails = () => {
        resetPaymentWizard();
        openWizardModal('payment-details');
    };

    /* ══════════════════════════════════════════════════════════
       EXCHANGE WIZARD
    ══════════════════════════════════════════════════════════ */
    const resetExchangeWizard = () => {
        document.querySelectorAll('.wiz-option[data-field="exchange_brand"]').forEach(b => b.classList.remove('selected'));
        const ev = document.getElementById('wiz_exchange_value');
        if (ev) ev.value = '';
        // Pre-fill if editing
        if (h_exchangeBrand.value) {
            const btn = document.querySelector(`.wiz-option[data-field="exchange_brand"][data-value="${h_exchangeBrand.value}"]`);
            if (btn) btn.classList.add('selected');
        }
        if (h_exchangeValue.value && ev) ev.value = h_exchangeValue.value;
    };

    window.saveExchangeDetails = () => {
        const brand = getWizValue('exchange_brand');
        const val   = parseFloat(document.getElementById('wiz_exchange_value')?.value || '') || 0;
        if (!brand) { if (window.showToast) window.showToast('Please select an exchange brand.', 'error'); return; }
        if (val <= 0){ if (window.showToast) window.showToast('Please enter a valid exchange value.', 'error'); return; }

        h_exchangeBrand.value = brand;
        h_exchangeValue.value = val;
        exchangeComplete = true;
        window.closeWizardModal('exchange-details');
        renderExchangeSummary(brand, val);
        if (window.showToast) window.showToast('Exchange details saved!', 'success');
    };

    const renderExchangeSummary = (brand, val) => {
        clearExchangeSummary();
        const container = document.getElementById('summaryCardsContainer');
        const section   = document.getElementById('selectedDetailsSummary');
        if (!container) return;

        const card = document.createElement('div');
        card.id = 'summaryCard-exchange';
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="card-icon bg-teal-100">
                <span class="material-symbols-outlined text-[18px] text-teal-600">swap_horiz</span>
            </div>
            <div class="card-body">
                <div class="card-title">🔄 Exchange Details</div>
                <div class="card-detail">${brand}</div>
                <div class="card-detail text-teal-700 font-extrabold">${fmt(val)}</div>
            </div>
            <button class="card-edit-btn" onclick="editExchangeDetails()" title="Edit Exchange Details">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>`;
        container.appendChild(card);
        if (section) section.classList.remove('hidden');
    };

    const clearExchangeSummary = () => {
        document.getElementById('summaryCard-exchange')?.remove();
        checkSummaryVisibility();
    };

    window.editExchangeDetails = () => {
        resetExchangeWizard();
        openWizardModal('exchange-details');
    };

    /* ══════════════════════════════════════════════════════════
       SALES PERSON — Dynamic load from /api/users
    ══════════════════════════════════════════════════════════ */
    let salesPersonData = [];

    window.openSalesPersonModal = () => {
        window.openPopupModal('sales_person');
        if (salesPersonData.length === 0) loadSalesPersonList();
    };

    const loadSalesPersonList = async () => {
        const listEl = document.getElementById('salesPersonList') || document.querySelector('#modal-sales_person .option-list') || document.getElementById('list-sales_person');
        if (!listEl) return;
        try {
            const res  = await fetch('/api/sales-persons');
            if (!res.ok) throw new Error('Failed to load sales persons');
            salesPersonData = await res.json();
            renderSalesPersonList(salesPersonData);
        } catch (e) {
            if (listEl) listEl.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Failed to load staff list.</p>';
        }
    };

    const renderSalesPersonList = (list) => {
        const listEl = document.getElementById('salesPersonList') || document.querySelector('#modal-sales_person .option-list') || document.getElementById('list-sales_person');
        if (!listEl) return;
        if (list.length === 0) {
            listEl.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">No staff found.</p>';
            return;
        }
        listEl.innerHTML = list.map(u => {
            const display  = u.display_name || u.username || '';
            const initials = display.split(/[\s\-\u2014]+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0].toUpperCase()).join('').slice(0, 2) || '??';
            const safe     = display.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const onClickFn = window.selectSalesPerson ? `selectSalesPerson('${safe}')` : `selectPopupOption('sales_person', '${safe}')`;
            return `<button type="button" class="option-item flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 text-left group hover:border-[#0D70C0]/30 hover:bg-blue-50/40 transition-all active:scale-[0.98]"
                        onclick="${onClickFn}">
                        <span class="w-8 h-8 rounded-full bg-[#0D70C0]/10 text-[#0D70C0] flex items-center justify-center flex-shrink-0 text-xs font-bold">${initials}</span>
                        <span class="text-sm font-semibold text-slate-700">${display}</span>
                    </button>`;
        }).join('');
    };

    // Proactively load staff list on initialization
    loadSalesPersonList();

    window.filterSalesPersonList = (query) => {
        const q = query.toLowerCase().trim();
        const filtered = q
            ? salesPersonData.filter(u => 
                (u.username || '').toLowerCase().includes(q) ||
                (u.employee_id || '').toLowerCase().includes(q) ||
                (u.role || '').toLowerCase().includes(q)
              )
            : salesPersonData;
        renderSalesPersonList(filtered);
    };

    window.selectSalesPerson = (display) => {
        if (salesPersonInput) {
            salesPersonInput.value = display;
            salesPersonInput.classList.remove('border-rose-500');
        }
        renderSalesPersonChip(display);
        window.closePopupModal('sales_person');
    };

    const renderSalesPersonChip = (display) => {
        document.getElementById('summaryCard-salesperson')?.remove();
        const container = document.getElementById('summaryCardsContainer');
        const section   = document.getElementById('selectedDetailsSummary');
        if (!container) return;

        const initials = display.split(' ').filter(w => /^[A-Z]/.test(w)).map(w => w[0]).join('').slice(0, 2);
        const card = document.createElement('div');
        card.id = 'summaryCard-salesperson';
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="card-icon bg-[#0D70C0]/10">
                <span class="text-sm font-extrabold text-[#0D70C0]">${initials}</span>
            </div>
            <div class="card-body">
                <div class="card-title">👤 Sales Person</div>
                <div class="card-detail">${display}</div>
            </div>
            <button class="card-edit-btn" onclick="openSalesPersonModal()" title="Change Sales Person">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>`;
        container.appendChild(card);
        if (section) section.classList.remove('hidden');
    };

    /* ── Summary section show/hide ───────────────────────────── */
    const checkSummaryVisibility = () => {
        const section = document.getElementById('selectedDetailsSummary');
        const container = document.getElementById('summaryCardsContainer');
        if (!section || !container) return;
        section.classList.toggle('hidden', container.children.length === 0);
    };

    /* ══════════════════════════════════════════════════════════
       CLEAR FORM — reset all wizards + summaries
    ══════════════════════════════════════════════════════════ */
    const btnClearForm = document.getElementById('btnClearForm');
    if (btnClearForm) {
        btnClearForm.addEventListener('click', () => {
            // Clear summary cards
            const container = document.getElementById('summaryCardsContainer');
            if (container) container.innerHTML = '';
            checkSummaryVisibility();
            // Reset wizard flags
            financeComplete = paymentComplete = exchangeComplete = false;
            // Clear hidden inputs
            [h_financeProvider, h_downPaymentMode, h_downPaymentValue,
             h_cashAmount, h_cardAmount, h_ewalletAmount, h_totalReceived,
             h_exchangeBrand, h_exchangeValue].forEach(el => { if (el) el.value = ''; });
            salesPersonData.length = 0;
        });
    }

    /* ══════════════════════════════════════════════════════════
       BARCODE SCANNER
    ══════════════════════════════════════════════════════════ */
    const btnScanBarcode = document.getElementById('btnScanBarcode');
    let barcodeFilePicker = document.getElementById('barcodeFilePicker');
    
    // Dynamically create file input if missing (e.g. edit_request.html)
    if (!barcodeFilePicker) {
        barcodeFilePicker = document.createElement('input');
        barcodeFilePicker.type = 'file';
        barcodeFilePicker.id = 'barcodeFilePicker';
        barcodeFilePicker.accept = 'image/*';
        barcodeFilePicker.className = 'hidden';
        document.body.appendChild(barcodeFilePicker);
    }
    // Access direct camera with autofocus
    barcodeFilePicker.setAttribute('capture', 'environment');

    // Dynamically create reader container if missing (required by Html5Qrcode constructor)
    let dummyReader = document.getElementById('scannerReader');
    if (!dummyReader) {
        dummyReader = document.createElement('div');
        dummyReader.id = 'scannerReader';
        dummyReader.style.display = 'none';
        document.body.appendChild(dummyReader);
    }

    let html5QrCode = null;

    const playScanBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
            osc.start();
            setTimeout(() => { osc.stop(); audioCtx.close(); }, 90);
        } catch(e) {}
    };

    const handleDecodedIMEI = async (decodedText) => {
        const trimmed = decodedText.trim();
        try {
            const data = await window.safeFetch('/api/verify-imei', {
                method:'POST',
                body: JSON.stringify({ imei: trimmed })
            });
            if (data.success) {
                playScanBeep();
                if (imeiInput) { 
                    imeiInput.value = trimmed; 
                    imeiInput.classList.remove('border-rose-500'); 
                    imeiInput.dispatchEvent(new Event('input',{bubbles:true})); 
                }
                if (window.showToast) window.showToast('IMEI scanned & verified: ' + trimmed, 'success');
            } else {
                if (window.showToast) window.showToast(data.message || 'Invalid scanned IMEI.', 'error');
            }
        } catch(e) { 
            if (window.showToast) window.showToast(e.message || 'Server verification failed.', 'error'); 
        }
    };

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
        header.style.marginBottom = '14px';
        header.style.padding = '0 20px';
        header.innerHTML = `
            <h3 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 700; color: #f97316; letter-spacing: 0.5px;">Crop Barcode Area</h3>
            <p style="margin: 0; font-size: 0.8rem; color: #94a3b8;">Drag the orange handles to crop exactly around the barcode, then tap <strong style="color:#f97316">✂ Scan Crop</strong>.</p>
        `;
        modal.appendChild(header);

        const container = document.createElement('div');
        container.style.width = '92%';
        container.style.maxWidth = '480px';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        modal.appendChild(container);

        const imageWrapper = document.createElement('div');
        imageWrapper.style.position = 'relative';
        imageWrapper.style.display = 'inline-block';
        imageWrapper.style.maxWidth = '100%';
        imageWrapper.style.maxHeight = '55vh';
        imageWrapper.style.borderRadius = '12px';
        imageWrapper.style.overflow = 'hidden';
        imageWrapper.style.backgroundColor = '#000';
        imageWrapper.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.6)';
        imageWrapper.style.userSelect = 'none';
        container.appendChild(imageWrapper);
        
        const loader = document.createElement('div');
        loader.style.padding = '40px';
        loader.style.fontSize = '0.9rem';
        loader.style.color = '#94a3b8';
        loader.innerText = 'Loading image...';
        imageWrapper.appendChild(loader);

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '10px';
        controls.style.marginTop = '18px';
        controls.style.width = '92%';
        controls.style.maxWidth = '480px';
        
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
        btnScan.innerText = '✂ Scan Crop';
        btnScan.style.flex = '2';
        btnScan.style.padding = '13px 16px';
        btnScan.style.borderRadius = '12px';
        btnScan.style.border = 'none';
        btnScan.style.backgroundColor = '#f97316';
        btnScan.style.color = '#fff';
        btnScan.style.fontSize = '0.9rem';
        btnScan.style.fontWeight = '700';
        btnScan.style.cursor = 'pointer';
        btnScan.style.transition = 'all 0.2s ease';
        btnScan.style.boxShadow = '0 4px 14px rgba(249,115,22,0.35)';
        btnScan.addEventListener('mouseenter', () => { btnScan.style.backgroundColor = '#ea580c'; });
        btnScan.addEventListener('mouseleave', () => { btnScan.style.backgroundColor = '#f97316'; });

        controls.appendChild(btnCancel);
        controls.appendChild(btnScan);
        modal.appendChild(controls);

        document.body.appendChild(modal);
        
        requestAnimationFrame(() => modal.style.opacity = '1');

        const img = new Image();
        const fileReader = new FileReader();
        fileReader.onload = (e) => { img.src = e.target.result; };
        fileReader.readAsDataURL(file);

        img.onload = function () {
            loader.remove();

            img.style.display = 'block';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '55vh';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.pointerEvents = 'none';
            img.style.userSelect = 'none';
            img.draggable = false;
            imageWrapper.appendChild(img);

            const wW = img.offsetWidth;
            const wH = img.offsetHeight;
            imageWrapper.style.width  = wW + 'px';
            imageWrapper.style.height = wH + 'px';

            // 4 dark mask divs surrounding the crop box
            const makeMask = () => {
                const m = document.createElement('div');
                m.style.position = 'absolute';
                m.style.background = 'rgba(10,18,35,0.65)';
                m.style.pointerEvents = 'none';
                m.style.zIndex = '5';
                imageWrapper.appendChild(m);
                return m;
            };
            const maskTop    = makeMask();
            const maskBottom = makeMask();
            const maskLeft   = makeMask();
            const maskRight  = makeMask();

            // Initial crop: 80% wide, 30% tall, centred vertically
            let cropX = Math.round(wW * 0.10);
            let cropY = Math.round(wH * 0.35);
            let cropW = Math.round(wW * 0.80);
            let cropH = Math.round(wH * 0.30);
            const MIN_SIZE = 20;

            // Crop box
            const cropBox = document.createElement('div');
            cropBox.style.position = 'absolute';
            cropBox.style.border = '2px solid #f97316';
            cropBox.style.boxSizing = 'border-box';
            cropBox.style.cursor = 'move';
            cropBox.style.zIndex = '10';
            imageWrapper.appendChild(cropBox);

            // 8 resize handles: 4 corners + 4 edge midpoints
            const handleDefs = [
                { id:'tl', cursor:'nw-resize', top:'-6px',    left:'-6px'               },
                { id:'tr', cursor:'ne-resize', top:'-6px',    right:'-6px'              },
                { id:'bl', cursor:'sw-resize', bottom:'-6px', left:'-6px'               },
                { id:'br', cursor:'se-resize', bottom:'-6px', right:'-6px'              },
                { id:'mt', cursor:'n-resize',  top:'-6px',    left:'calc(50% - 6px)'    },
                { id:'mb', cursor:'s-resize',  bottom:'-6px', left:'calc(50% - 6px)'    },
                { id:'ml', cursor:'w-resize',  top:'calc(50% - 6px)', left:'-6px'       },
                { id:'mr', cursor:'e-resize',  top:'calc(50% - 6px)', right:'-6px'      },
            ];
            const handles = {};
            handleDefs.forEach(hd => {
                const h = document.createElement('div');
                h.style.position = 'absolute';
                h.style.width = '12px'; h.style.height = '12px';
                h.style.backgroundColor = '#f97316';
                h.style.border = '2px solid #fff';
                h.style.borderRadius = '3px';
                h.style.cursor = hd.cursor;
                h.style.zIndex = '20';
                if (hd.top)    h.style.top    = hd.top;
                if (hd.bottom) h.style.bottom = hd.bottom;
                if (hd.left)   h.style.left   = hd.left;
                if (hd.right)  h.style.right  = hd.right;
                h.dataset.handle = hd.id;
                cropBox.appendChild(h);
                handles[hd.id] = h;
            });

            // Redraw masks & crop box
            const updateOverlay = () => {
                cropX = Math.max(0, Math.min(wW - MIN_SIZE, cropX));
                cropY = Math.max(0, Math.min(wH - MIN_SIZE, cropY));
                cropW = Math.max(MIN_SIZE, Math.min(wW - cropX, cropW));
                cropH = Math.max(MIN_SIZE, Math.min(wH - cropY, cropH));

                cropBox.style.left   = cropX + 'px';
                cropBox.style.top    = cropY + 'px';
                cropBox.style.width  = cropW + 'px';
                cropBox.style.height = cropH + 'px';

                maskTop.style.top    = '0';    maskTop.style.left    = '0';              maskTop.style.width    = '100%';                   maskTop.style.height   = cropY + 'px';
                maskBottom.style.top = (cropY+cropH)+'px'; maskBottom.style.left='0'; maskBottom.style.width='100%'; maskBottom.style.height=(wH-cropY-cropH)+'px';
                maskLeft.style.top   = cropY+'px'; maskLeft.style.left   = '0';          maskLeft.style.width   = cropX+'px';               maskLeft.style.height  = cropH+'px';
                maskRight.style.top  = cropY+'px'; maskRight.style.left  = (cropX+cropW)+'px'; maskRight.style.width=(wW-cropX-cropW)+'px'; maskRight.style.height = cropH+'px';
            };
            updateOverlay();

            // Drag/resize
            let dragMode = null;
            let dragStartX = 0, dragStartY = 0;
            let sCropX = 0, sCropY = 0, sCropW = 0, sCropH = 0;

            const getXY = (e) => {
                const rect = imageWrapper.getBoundingClientRect();
                if (e.touches && e.touches.length) {
                    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
                }
                return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            };

            const onDown = (e) => {
                const hKey = e.target.dataset && e.target.dataset.handle;
                dragMode = hKey || (e.target === cropBox ? 'move' : null);
                if (!dragMode) return;
                const xy = getXY(e);
                dragStartX = xy.x; dragStartY = xy.y;
                sCropX = cropX; sCropY = cropY; sCropW = cropW; sCropH = cropH;
                e.preventDefault(); e.stopPropagation();
            };

            const onMove = (e) => {
                if (!dragMode) return;
                const xy = getXY(e);
                const dx = xy.x - dragStartX;
                const dy = xy.y - dragStartY;
                if (dragMode === 'move') {
                    cropX = sCropX + dx; cropY = sCropY + dy;
                } else {
                    const h = dragMode;
                    if (h==='tl'||h==='bl'||h==='ml') { cropX = sCropX + dx; cropW = sCropW - dx; }
                    if (h==='tr'||h==='br'||h==='mr') { cropW = sCropW + dx; }
                    if (h==='tl'||h==='tr'||h==='mt') { cropY = sCropY + dy; cropH = sCropH - dy; }
                    if (h==='bl'||h==='br'||h==='mb') { cropH = sCropH + dy; }
                }
                updateOverlay();
                e.preventDefault();
            };

            const onUp = () => { dragMode = null; };

            cropBox.addEventListener('mousedown',  onDown);
            window.addEventListener('mousemove',   onMove);
            window.addEventListener('mouseup',     onUp);
            cropBox.addEventListener('touchstart', onDown, { passive: false });
            window.addEventListener('touchmove',   onMove, { passive: false });
            window.addEventListener('touchend',    onUp);
            Object.values(handles).forEach(h => {
                h.addEventListener('mousedown',  onDown);
                h.addEventListener('touchstart', onDown, { passive: false });
            });

            // Scan: crop canvas → decode
            btnScan.addEventListener('click', () => {
                btnScan.disabled = true;
                btnScan.innerText = 'Scanning...';
                btnScan.style.backgroundColor = '#d97706';

                const scaleX = img.naturalWidth  / wW;
                const scaleY = img.naturalHeight / wH;
                const sX = Math.max(0, Math.round(cropX * scaleX));
                const sY = Math.max(0, Math.round(cropY * scaleY));
                const sW = Math.max(1, Math.min(Math.round(cropW * scaleX), img.naturalWidth  - sX));
                const sH = Math.max(1, Math.min(Math.round(cropH * scaleY), img.naturalHeight - sY));

                const canvas = document.createElement('canvas');
                canvas.width  = sW;
                canvas.height = sH;
                canvas.getContext('2d').drawImage(img, sX, sY, sW, sH, 0, 0, sW, sH);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        btnScan.disabled = false;
                        btnScan.innerText = '✂ Scan Crop';
                        btnScan.style.backgroundColor = '#f97316';
                        if (window.showToast) window.showToast('Failed to crop image. Try again.', 'error');
                        return;
                    }
                    const croppedFile = new File([blob], 'cropped_barcode.png', { type: 'image/png' });
                    onCropAndScan(croppedFile, () => {
                        modal.style.opacity = '0';
                        setTimeout(() => modal.remove(), 300);
                    }, () => {
                        btnScan.disabled = false;
                        btnScan.innerText = '✂ Scan Crop';
                        btnScan.style.backgroundColor = '#f97316';
                    });
                }, 'image/png');
            });
        };
    }

    if (barcodeFilePicker) {
        barcodeFilePicker.addEventListener('change', async (e) => {
            const file = e.target.files[0]; if (!file) return;
            if (window.showToast) window.showToast('Preparing preview...', 'success');
            
            showBarcodeCroppingModal(file, async (croppedFile, onSuccess, onError) => {
                if (window.showToast) window.showToast('Scanning cropped area...', 'success');
                if (!html5QrCode) html5QrCode = new Html5Qrcode('scannerReader');
                try { 
                    const text = await html5QrCode.scanFile(croppedFile, true);
                    await handleDecodedIMEI(text); 
                    onSuccess();
                }
                catch(err) { 
                    if (window.showToast) {
                        window.showToast('Could not decode a barcode from the aligned region. Please align and try again.', 'error');
                    }
                    onError();
                }
            }, () => {
                if (window.showToast) window.showToast('Scanning cancelled.', 'info');
            });
            
            barcodeFilePicker.value = '';
        });
    }


    if (btnScanBarcode) {
        btnScanBarcode.addEventListener('click', () => {
            if (barcodeFilePicker) barcodeFilePicker.click();
        });
    }

    /* ══════════════════════════════════════════════════════════
       FORM SUBMIT
    ══════════════════════════════════════════════════════════ */
    if (customerForm && !window.targetCustomerId) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            customerForm.querySelectorAll('input, textarea').forEach(el => el.classList.remove('border-rose-500'));

            const customer_name  = customerNameInput?.value.trim()   || '';
            const mobile_number  = mobileInput?.value.trim()         || '';
            const item_model     = document.getElementById('item_model')?.value.trim() || '';
            const imei_number    = imeiInput?.value.trim()            || '';
            const transaction_mode = transactionModeInput?.value      || '';
            const exchange_status  = exchangeStatusInput?.value       || '';
            const sales_person     = salesPersonInput?.value          || '';
            const remarks          = remarksInput?.value.trim()       || '';

            // Basic required field validation
            if (!customer_name) { customerNameInput?.classList.add('border-rose-500'); if(window.showToast) window.showToast('Customer Name is required.','error'); return; }
            if (mobile_number.length !== 10) { mobileInput?.classList.add('border-rose-500'); if(window.showToast) window.showToast('Mobile number must be exactly 10 digits.','error'); return; }
            if (!item_model) { document.getElementById('item_model')?.classList.add('border-rose-500'); if(window.showToast) window.showToast('Item / Model is required.','error'); return; }
            if (!imei_number) { imeiInput?.classList.add('border-rose-500'); if(window.showToast) window.showToast('IMEI number is required.','error'); return; }
            if (!transaction_mode) { transactionModeInput?.classList.add('border-rose-500'); if(window.showToast) window.showToast('Transaction Mode is required.','error'); return; }

            // Wizard completion validation
            if (transaction_mode === 'Finance' && !financeComplete) {
                transactionModeInput?.classList.add('border-rose-500');
                if(window.showToast) window.showToast('Please complete Finance Details.','error');
                setTimeout(() => openWizardModal('finance-details'), 100);
                return;
            }
            if (transaction_mode === 'Non-Finance' && !paymentComplete) {
                transactionModeInput?.classList.add('border-rose-500');
                if(window.showToast) window.showToast('Please complete Payment Details.','error');
                setTimeout(() => openWizardModal('payment-details'), 100);
                return;
            }

            if (!exchange_status) { exchangeStatusInput?.classList.add('border-rose-500'); if(window.showToast) window.showToast('Exchange status is required.','error'); return; }
            if (exchange_status === 'Yes' && !exchangeComplete) {
                exchangeStatusInput?.classList.add('border-rose-500');
                if(window.showToast) window.showToast('Please complete Exchange Details.','error');
                setTimeout(() => openWizardModal('exchange-details'), 100);
                return;
            }
            if (!sales_person) { salesPersonInput?.classList.add('border-rose-500'); if(window.showToast) window.showToast('Sales Person is required.','error'); return; }

            const btnSubmit = document.getElementById('btnSubmit');
            btnSubmit.disabled = true;
            const originalText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = 'Saving... <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>';

            const payload = {
                customer_name, mobile_number, item_model, imei_number,
                transaction_mode, exchange_status, sales_person, remarks,
                finance_provider    : h_financeProvider.value,
                down_payment_mode   : h_downPaymentMode.value,
                down_payment_value  : parseFloat(h_downPaymentValue.value) || 0,
                cash_amount         : parseFloat(h_cashAmount.value) || 0,
                card_amount         : parseFloat(h_cardAmount.value) || 0,
                ewallet_amount      : parseFloat(h_ewalletAmount.value) || 0,
                exchange_brand      : h_exchangeBrand.value,
                exchange_value      : parseFloat(h_exchangeValue.value) || 0
            };

            try {
                const res = await window.safeFetch('/api/customers', {
                    method:'POST',
                    body: JSON.stringify(payload)
                });
                if (res.success) {
                    if(window.showToast) window.showToast('Customer saved successfully!','success');
                    customerForm.reset();
                    // Clear all summaries and wizard state
                    btnClearForm?.dispatchEvent(new Event('click'));
                    if (window.loadDashboardData) window.loadDashboardData();
                } else {
                    if(window.showToast) window.showToast(res.message || 'Failed to save customer.','error');
                }
            } catch(err) {
                if(window.showToast) window.showToast(err.message || 'Network error while saving customer.','error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalText;
            }
        });
    }

    /* Cancel button */
    const btnCancelForm2 = document.getElementById('btnCancelForm');
    if (btnCancelForm2 && !window.targetCustomerId) {
        btnCancelForm2.addEventListener('click', () => {
            if (window.switchView) window.switchView('TOTAL');
            else window.location.href = '/dashboard';
        });
    }

    /* Expose for edit_request.html compatibility */
    window.rerunToggleFields = () => {}; // no-op — replaced by wizard flow

});
