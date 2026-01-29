<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Language Lines
    |--------------------------------------------------------------------------
    |
    | The following language lines are used during authentication for various
    | messages that we need to display to the user. You are free to modify
    | these language lines according to your application's requirements.
    |
    */

    'failed' => 'These credentials do not match our records.',
    'password' => 'The provided password is incorrect.',
    'throttle' => 'Too many login attempts. Please try again in :seconds seconds.',

    // --- LOGIN PAGE ---
    'title' => 'Log in to your account',
    'description' => 'Enter your email and password below to log in',
    'email_label' => 'Email address',
    'email_placeholder' => 'email@example.com',
    'password_label' => 'Password',
    'password_placeholder' => 'Password',
    'remember_me' => 'Remember me',
    'forgot_password' => 'Forgot password?',
    'login_button' => 'Log in',
    'app_name' => 'PPJK Tracking',

    // --- MANAGE USERS PAGE (General) ---
    'page_title_manage' => 'Manage Users',
    'filter_placeholder' => 'Filter users...',
    'add_button' => 'Add User',
    'no_results' => 'No results.',

    // --- MANAGE USERS (Create Dialog) ---
    'title_create' => 'Add User',
    'desc_create' => 'Fill in the details to create a new user.',

    // Form Labels & Placeholders (Create & Edit)
    'label_name' => 'Name',
    'placeholder_name' => 'Enter name',
    'label_email' => 'Email',
    'placeholder_email' => 'Enter email',
    'label_password' => 'Password',
    'placeholder_password' => 'Enter password',
    'label_password_confirm' => 'Confirm Password',
    'placeholder_password_confirm' => 'Confirm password',
    
    'label_company' => 'Company',
    'placeholder_company' => 'Select company',
    'no_data_company' => 'No company data',
    
    'label_user_type' => 'User Type',
    'placeholder_user_type' => 'Select user type',
    'type_internal' => 'Internal',
    'type_external' => 'External',
    
    'label_role_internal' => 'Internal Role',
    'placeholder_role_internal' => 'Select role',
    
    'label_customer' => 'Customer',
    'placeholder_customer' => 'Select Customer',
    'no_data_customer' => 'No customer data',
    
    'btn_create' => 'Create',
    'btn_cancel' => 'Cancel',

    // --- MANAGE USERS (Delete Dialog) ---
    'title_delete' => 'Delete Data',
    'text_delete_confirm' => 'Data :email will be deleted. Are you sure?',
    'btn_delete' => 'Delete',
    'btn_close'  => 'Close',

    // Table Headers & Actions
    'header_roles'   => 'Roles',
    'header_actions' => 'Actions',
    'btn_edit'       => 'Edit',

    // --- MANAGE USERS (Edit Dialog) ---
    'title_edit' => 'Edit User',
    'desc_edit'  => 'Update the details of the user.',
    'text_external_info' => 'This user is External (Customer). No role assignment needed.',
    'btn_save'   => 'Save Changes',

    // --- TOASTS & VALIDATIONS ---
    'toast_delete_success' => 'User deleted successfully!',
    'toast_delete_error'   => 'Failed to delete user.',
    'toast_update_success' => 'User updated successfully!',
    'toast_update_error'   => 'Failed to update user.',
    'error_create'         => 'Error creating user.',

    // Validation Messages
    'validation_name_email_required' => 'Name and Email are required.',
    'validation_required' => 'All text fields are required (Name, Email, Password).',
    'validation_password_mismatch' => 'Password and confirmation do not match.',
    'validation_company_required' => 'Please select a Company.',
    'validation_type_required' => 'Please select a User Type (Internal / External).',
    'validation_role_internal_required' => 'Role is required for Internal users.', // Used in Edit
    'validation_role_required' => 'Please select an Internal Role.', // Used in Create
    'validation_customer_required' => 'Please select a Customer for External user.',

    // Pagination
    'pagination_selected_rows' => ':selected of :total row(s) selected.',
    'pagination_rows_per_page' => 'Rows per page',
    'pagination_page_of'       => 'Page :page of :total',
    'pagination_first'         => 'Go to first page',
    'pagination_prev'          => 'Go to previous page',
    'pagination_next'          => 'Go to next page',
    'pagination_last'          => 'Go to last page',
];
