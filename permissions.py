ROLE_PERMISSIONS = {
    'super_admin': [
        'dashboard_view', 'customer_create', 'customer_history_view',
        'customer_history_edit', 'customer_history_delete', 'customer_clear_all',
        'payment_tracker_view', 'payment_tracker_create', 'payment_tracker_edit', 'payment_tracker_delete',
        'user_create', 'user_update', 'user_delete', 'settings_access',
        'edit_request_view', 'edit_request_approve', 'edit_request_reject',
        'crm_view', 'crm_create', 'crm_edit', 'crm_delete', 'export_data'
    ],
    'admin': [
        'dashboard_view', 'customer_create', 'customer_history_view',
        'customer_history_edit', 'customer_history_delete', 'customer_clear_all',
        'payment_tracker_view', 'payment_tracker_create', 'payment_tracker_edit', 'payment_tracker_delete',
        'user_create', 'user_update', 'user_delete', 'settings_access',
        'edit_request_view', 'edit_request_approve', 'edit_request_reject',
        'crm_view', 'crm_create', 'crm_edit', 'crm_delete'
    ],
    'store_employee': [
        'dashboard_view', 'customer_create', 'customer_history_view',
        'customer_edit_request_create',
        'crm_view', 'crm_create'
    ]
}
