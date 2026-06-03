document.addEventListener('DOMContentLoaded', () => {
    const customerForm = document.getElementById('customerForm');
    const transactionModeInput = document.getElementById('transaction_mode');
    const exchangeStatusInput = document.getElementById('exchange_status');
    const salesPersonInput = document.getElementById('sales_person');
    const financeProviderInput = document.getElementById('finance_provider');
    const downPaymentModeInput = document.getElementById('down_payment_mode');
    const exchangeBrandInput = document.getElementById('exchange_brand');
    const imeiInput = document.getElementById('imei_number');
    const mobileInput = document.getElementById('mobile_number');
    const customerNameInput = document.getElementById('customer_name');
    const downPaymentValueInput = document.getElementById('down_payment_value');
    const cashAmountInput = document.getElementById('cash_amount');
    const cardAmountInput = document.getElementById('card_amount');
    const ewalletAmountInput = document.getElementById('ewallet_amount');
    const totalAmountReceivedInput = document.getElementById('total_amount_received');
    const remarksInput = document.getElementById('remarks');

    // Toggle conditional fields
    const toggleFields = () => {
        const tMode = transactionModeInput ? transactionModeInput.value : '';
        const exgStatus = exchangeStatusInput ? exchangeStatusInput.value : '';

        // Finance vs. Non-Finance
        const financeFields = [
            'finance_provider_container',
            'down_payment_mode_container',
            'down_payment_value_container'
        ];
        const nonFinanceFields = [
            'cash_amount_container',
            'card_amount_container',
            'ewallet_amount_container',
            'total_amount_received_container'
        ];

        if (tMode === 'Finance') {
            financeFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hidden');
            });
            nonFinanceFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            if (financeProviderInput) financeProviderInput.setAttribute('required', 'required');
            if (downPaymentModeInput) downPaymentModeInput.setAttribute('required', 'required');
            if (downPaymentValueInput) downPaymentValueInput.setAttribute('required', 'required');

            if (cashAmountInput) cashAmountInput.removeAttribute('required');
            if (cardAmountInput) cardAmountInput.removeAttribute('required');
            if (ewalletAmountInput) ewalletAmountInput.removeAttribute('required');
        } else if (tMode === 'Non-Finance') {
            financeFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            nonFinanceFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hidden');
            });

            if (financeProviderInput) financeProviderInput.removeAttribute('required');
            if (downPaymentModeInput) downPaymentModeInput.removeAttribute('required');
            if (downPaymentValueInput) downPaymentValueInput.removeAttribute('required');
        } else {
            // Hide both until selected
            financeFields.concat(nonFinanceFields).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
        }

        // Exchange Brand/Value
        const exchangeFields = [
            'exchange_brand_container',
            'exchange_value_container'
        ];

        if (exgStatus === 'Yes') {
            exchangeFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hidden');
            });
            if (exchangeBrandInput) exchangeBrandInput.setAttribute('required', 'required');
            const valInput = document.getElementById('exchange_value');
            if (valInput) valInput.setAttribute('required', 'required');
        } else {
            exchangeFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            if (exchangeBrandInput) exchangeBrandInput.removeAttribute('required');
            const valInput = document.getElementById('exchange_value');
            if (valInput) valInput.removeAttribute('required');
        }
    };

    // Calculate real-time split totals
    const calculateTotals = () => {
        const cash = parseFloat(cashAmountInput ? cashAmountInput.value : 0) || 0;
        const card = parseFloat(cardAmountInput ? cardAmountInput.value : 0) || 0;
        const ewallet = parseFloat(ewalletAmountInput ? ewalletAmountInput.value : 0) || 0;
        const total = cash + card + ewallet;
        if (totalAmountReceivedInput) {
            totalAmountReceivedInput.value = total.toFixed(2);
        }
    };

    // Add event listeners for toggles
    if (transactionModeInput) transactionModeInput.addEventListener('change', toggleFields);
    if (exchangeStatusInput) exchangeStatusInput.addEventListener('change', toggleFields);

    // Add event listeners for total calculation
    if (cashAmountInput) cashAmountInput.addEventListener('input', calculateTotals);
    if (cardAmountInput) cardAmountInput.addEventListener('input', calculateTotals);
    if (ewalletAmountInput) ewalletAmountInput.addEventListener('input', calculateTotals);

    // Initial toggle on page load
    toggleFields();

    // Expose toggleFields globally so that pages with pre-filled forms
    // (e.g. edit_request.html) can re-run the toggle after DOM is ready.
    window.rerunToggleFields = toggleFields;

    // Auto-capitalize name fields
    if (customerNameInput) {
        customerNameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            e.target.value = val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        });
    }

    // Number restricts
    const restrictToDigits = (el) => {
        if (!el) return;
        el.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
        el.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    };
    restrictToDigits(mobileInput);
    restrictToDigits(imeiInput);

    const restrictToFloat = (el) => {
        if (!el) return;
        el.addEventListener('keypress', (e) => {
            if (!/[0-9.]/.test(e.key)) e.preventDefault();
        });
        el.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9.]/g, '');
            const dots = val.split('.');
            if (dots.length > 2) {
                val = dots[0] + '.' + dots.slice(1).join('');
            }
            e.target.value = val;
        });
    };
    restrictToFloat(downPaymentValueInput);
    restrictToFloat(cashAmountInput);
    restrictToFloat(cardAmountInput);
    restrictToFloat(ewalletAmountInput);
    restrictToFloat(document.getElementById('exchange_value'));

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

        // Highlight selected option and add checkmark
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

    // --- BARCODE SCANNER ---
    const btnScanBarcode = document.getElementById('btnScanBarcode');
    const scannerModal = document.getElementById('scannerModal');
    const btnCancelScanner = document.getElementById('btnCancelScanner');
    const btnCancelScannerTop = document.getElementById('btnCancelScannerTop');
    const btnSwitchCamera = document.getElementById('btnSwitchCamera');
    const barcodeFilePicker = document.getElementById('barcodeFilePicker');
    const scannerErrorMessage = document.getElementById('scannerErrorMessage');
    const scannerErrorText = document.getElementById('scannerErrorText');

    let html5QrCode = null;
    let availableCameras = [];
    let currentCameraIndex = 0;
    let isScannerRunning = false;

    const showScannerError = (msg) => {
        if (scannerErrorText) scannerErrorText.textContent = msg;
        if (scannerErrorMessage) scannerErrorMessage.classList.remove('hidden');
    };

    const hideScannerError = () => {
        if (scannerErrorMessage) scannerErrorMessage.classList.add('hidden');
    };

    const playScanBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.09, audioCtx.currentTime);
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                audioCtx.close();
            }, 90);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDecodedIMEI = async (decodedText) => {
        const trimmed = decodedText.trim();
        try {
            const res = await fetch('/api/verify-imei', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imei: trimmed })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                playScanBeep();
                if (imeiInput) {
                    imeiInput.value = trimmed;
                    imeiInput.classList.remove('border-rose-500');
                    imeiInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                stopScanning();
                if (window.showToast) window.showToast('IMEI scanned & verified: ' + trimmed, 'success');
            } else {
                showScannerError(data.message || 'Invalid scanned IMEI.');
            }
        } catch (err) {
            showScannerError('Server verification failed.');
        }
    };

    const stopScanning = () => {
        if (html5QrCode) {
            if (isScannerRunning) {
                html5QrCode.stop().then(() => {
                    html5QrCode.clear();
                    html5QrCode = null;
                    isScannerRunning = false;
                }).catch(() => {
                    html5QrCode = null;
                    isScannerRunning = false;
                });
            } else {
                try { html5QrCode.clear(); } catch(e) {}
                html5QrCode = null;
            }
        }
        if (barcodeFilePicker) barcodeFilePicker.value = '';
        if (scannerModal) scannerModal.classList.add('hidden');
        hideScannerError();
    };

    const startCameraStream = (cameraIdOrConstraint) => {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode('scannerReader');
        }
        hideScannerError();

        const config = {
            fps: 12,
            qrbox: (w, h) => ({ width: Math.min(Math.floor(w * 0.85), 340), height: 110 }),
            videoConstraints: { width: { ideal: 1280 }, height: { ideal: 720 } },
            rememberLastUsedCamera: false,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };

        const successCb = (decodedText) => handleDecodedIMEI(decodedText);
        const errorCb = () => {};

        const startArg = typeof cameraIdOrConstraint === 'string'
            ? cameraIdOrConstraint
            : { facingMode: cameraIdOrConstraint };

        html5QrCode.start(startArg, config, successCb, errorCb)
            .then(() => {
                isScannerRunning = true;
                if (btnSwitchCamera) {
                    btnSwitchCamera.classList.toggle('hidden', availableCameras.length < 2);
                }
            })
            .catch(err => {
                isScannerRunning = false;
                showScannerError('Camera unavailable or permission denied.');
            });
    };

    const startScanning = async () => {
        if (!scannerModal) return;
        hideScannerError();
        scannerModal.classList.remove('hidden');

        try {
            availableCameras = await Html5Qrcode.getCameras();
        } catch (e) {
            availableCameras = [];
        }

        currentCameraIndex = 0;

        if (availableCameras.length > 0) {
            startCameraStream(availableCameras[0].id);
        } else {
            startCameraStream('environment');
        }
    };

    if (btnSwitchCamera) {
        btnSwitchCamera.addEventListener('click', async () => {
            if (availableCameras.length < 2) return;
            if (html5QrCode && isScannerRunning) {
                try {
                    await html5QrCode.stop();
                    html5QrCode.clear();
                } catch (e) {}
                html5QrCode = null;
                isScannerRunning = false;
            }
            currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
            html5QrCode = new Html5Qrcode('scannerReader');
            startCameraStream(availableCameras[currentCameraIndex].id);
        });
    }

    if (barcodeFilePicker) {
        barcodeFilePicker.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            hideScannerError();

            if (html5QrCode && isScannerRunning) {
                try {
                    await html5QrCode.stop();
                    html5QrCode.clear();
                } catch (er) {}
                html5QrCode = null;
                isScannerRunning = false;
            }

            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode('scannerReader');
            }

            try {
                const decodedText = await html5QrCode.scanFile(file, true);
                await handleDecodedIMEI(decodedText);
            } catch (err) {
                showScannerError('Could not decode a barcode from this image.');
            } finally {
                barcodeFilePicker.value = '';
            }
        });
    }

    if (btnScanBarcode) btnScanBarcode.addEventListener('click', startScanning);
    if (btnCancelScanner) btnCancelScanner.addEventListener('click', stopScanning);
    if (btnCancelScannerTop) btnCancelScannerTop.addEventListener('click', stopScanning);

    // --- FORM SUBMIT ---
    if (customerForm && !window.targetCustomerId) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset borders
            customerForm.querySelectorAll('input, textarea').forEach(el => {
                el.classList.remove('border-rose-500');
            });

            // Extract fields
            const customer_name = customerNameInput ? customerNameInput.value.trim() : '';
            const mobile_number = mobileInput ? mobileInput.value.trim() : '';
            const item_model = document.getElementById('item_model') ? document.getElementById('item_model').value.trim() : '';
            const imei_number = imeiInput ? imeiInput.value.trim() : '';
            const transaction_mode = transactionModeInput ? transactionModeInput.value : '';
            const finance_provider = financeProviderInput ? financeProviderInput.value : '';
            const down_payment_mode = downPaymentModeInput ? downPaymentModeInput.value : '';
            const down_payment_value = downPaymentValueInput ? parseFloat(downPaymentValueInput.value) || 0 : 0;
            const cash_amount = cashAmountInput ? parseFloat(cashAmountInput.value) || 0 : 0;
            const card_amount = cardAmountInput ? parseFloat(cardAmountInput.value) || 0 : 0;
            const ewallet_amount = ewalletAmountInput ? parseFloat(ewalletAmountInput.value) || 0 : 0;
            const exchange_status = exchangeStatusInput ? exchangeStatusInput.value : '';
            const exchange_brand = exchangeBrandInput ? exchangeBrandInput.value : '';
            const exchange_value = document.getElementById('exchange_value') ? parseFloat(document.getElementById('exchange_value').value) || 0 : 0;
            const sales_person = salesPersonInput ? salesPersonInput.value : '';
            const remarks = remarksInput ? remarksInput.value.trim() : '';

            // Basic front validation
            if (!customer_name) {
                if (customerNameInput) customerNameInput.classList.add('border-rose-500');
                if (window.showToast) window.showToast('Customer Name is required.', 'error');
                return;
            }
            if (mobile_number.length !== 10) {
                if (mobileInput) mobileInput.classList.add('border-rose-500');
                if (window.showToast) window.showToast('Mobile number must be exactly 10 digits.', 'error');
                return;
            }
            if (!item_model) {
                const el = document.getElementById('item_model');
                if (el) el.classList.add('border-rose-500');
                if (window.showToast) window.showToast('Item / Model is required.', 'error');
                return;
            }
            if (imei_number.length !== 15) {
                if (imeiInput) imeiInput.classList.add('border-rose-500');
                if (window.showToast) window.showToast('IMEI must be exactly 15 digits.', 'error');
                return;
            }
            if (!transaction_mode) {
                if (transactionModeInput) transactionModeInput.classList.add('border-rose-500');
                if (window.showToast) window.showToast('Transaction Mode is required.', 'error');
                return;
            }
            if (transaction_mode === 'Finance') {
                if (!finance_provider) {
                    if (financeProviderInput) financeProviderInput.classList.add('border-rose-500');
                    if (window.showToast) window.showToast('Finance Provider is required.', 'error');
                    return;
                }
                if (!down_payment_mode) {
                    if (downPaymentModeInput) downPaymentModeInput.classList.add('border-rose-500');
                    if (window.showToast) window.showToast('Down Payment Mode is required.', 'error');
                    return;
                }
            } else if (transaction_mode === 'Non-Finance') {
                const total = cash_amount + card_amount + ewallet_amount;
                if (total <= 0) {
                    if (window.showToast) window.showToast('Total received amount split must be greater than zero.', 'error');
                    return;
                }
            }
            if (exchange_status === 'Yes') {
                if (!exchange_brand) {
                    if (exchangeBrandInput) exchangeBrandInput.classList.add('border-rose-500');
                    if (window.showToast) window.showToast('Exchange Brand is required.', 'error');
                    return;
                }
            }
            if (!sales_person) {
                if (salesPersonInput) salesPersonInput.classList.add('border-rose-500');
                if (window.showToast) window.showToast('Sales Person is required.', 'error');
                return;
            }

            const btnSubmit = document.getElementById('btnSubmit');
            btnSubmit.disabled = true;
            const originalText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = 'Saving... <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>';

            const payload = {
                customer_name,
                mobile_number,
                item_model,
                imei_number,
                transaction_mode,
                finance_provider: transaction_mode === 'Finance' ? finance_provider : '',
                down_payment_mode: transaction_mode === 'Finance' ? down_payment_mode : '',
                down_payment_value: transaction_mode === 'Finance' ? down_payment_value : 0,
                cash_amount: transaction_mode === 'Non-Finance' ? cash_amount : 0,
                card_amount: transaction_mode === 'Non-Finance' ? card_amount : 0,
                ewallet_amount: transaction_mode === 'Non-Finance' ? ewallet_amount : 0,
                exchange_status,
                exchange_brand: exchange_status === 'Yes' ? exchange_brand : '',
                exchange_value: exchange_status === 'Yes' ? exchange_value : 0,
                sales_person,
                remarks
            };

            try {
                const response = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const res = await response.json();

                if (response.ok && res.success) {
                    if (window.showToast) window.showToast('Customer saved successfully!', 'success');
                    customerForm.reset();
                    toggleFields();
                    if (window.loadDashboardData) window.loadDashboardData();
                } else {
                    if (window.showToast) window.showToast(res.message || 'Failed to save customer.', 'error');
                }
            } catch (err) {
                if (window.showToast) window.showToast('Network error while saving customer.', 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalText;
            }
        });
    }

    // Cancel Button redirecting to list view or dashboard
    const btnCancelForm = document.getElementById('btnCancelForm');
    if (btnCancelForm && !window.targetCustomerId) {
        btnCancelForm.addEventListener('click', () => {
            if (window.switchView) {
                window.switchView('TOTAL');
            } else {
                window.location.href = '/dashboard';
            }
        });
    }
});
