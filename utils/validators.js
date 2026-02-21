const { body } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }).withMessage('Name too long'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const approveUserValidation = [
  body('is_approved').isBoolean().withMessage('is_approved must be boolean')
];

const assignModulesValidation = [
  body('module_ids').isArray().withMessage('module_ids must be an array'),
  body('module_ids.*').isInt({ min: 1 }).withMessage('Each module_id must be a positive integer')
];

const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 255 }).withMessage('Name too long'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('role_id').optional().isInt({ min: 1 }).withMessage('role_id must be a positive integer')
];

const superAdminLoginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const orgLoginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const createOrganizationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }).withMessage('Name too long'),
  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('address').optional().trim(),
  body('subscription_plan').optional().trim().isLength({ max: 100 }),
  body('package_id').optional().isInt({ min: 1 }),
  body('billing_cycle').optional().isIn(['MONTHLY', 'ANNUAL']),
  body('org_admin_name').trim().notEmpty().withMessage('Org admin name is required').isLength({ max: 255 }),
  body('org_admin_email').trim().notEmpty().withMessage('Org admin email is required').isEmail().normalizeEmail(),
  body('org_admin_password').notEmpty().withMessage('Org admin password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const updateOrganizationValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 255 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('address').optional().trim(),
  body('subscription_plan').optional().trim().isLength({ max: 100 }),
  body('is_active').optional().isBoolean()
];

const createOrgUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }),
  body('role').isIn(['ORG_ADMIN', 'EMPLOYEE']).withMessage('Role must be ORG_ADMIN or EMPLOYEE')
];

const updateOrgUserValidation = [
  body('name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('is_active').optional().isBoolean(),
  body('is_approved').optional().isBoolean(),
  body('role').optional().isIn(['ORG_ADMIN', 'EMPLOYEE'])
];

const assignOrgModulesValidation = [
  body('module_ids').isArray().withMessage('module_ids must be an array'),
  body('module_ids.*').isInt({ min: 1 }).withMessage('Each module_id must be a positive integer')
];

const createPackageValidation = [
  body('name').trim().notEmpty().withMessage('Package name is required').isLength({ max: 100 }),
  body('description').optional().trim(),
  body('price_monthly').optional().isFloat({ min: 0 }).withMessage('Monthly price must be non-negative'),
  body('price_annual').optional().isFloat({ min: 0 }).withMessage('Annual price must be non-negative'),
  body('annual_discount_percent').optional().isFloat({ min: 0, max: 100 }),
  body('employee_limit').optional().isInt({ min: 1 }).withMessage('Employee limit must be at least 1'),
  body('duration_days').optional().isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),
  body('is_demo').optional().isBoolean(),
  body('module_ids').optional().isArray(),
  body('module_ids.*').optional().isInt({ min: 1 })
];

const updatePackageValidation = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim(),
  body('price_monthly').optional().isFloat({ min: 0 }),
  body('price_annual').optional().isFloat({ min: 0 }),
  body('duration_days').optional().isInt({ min: 1 }),
  body('annual_discount_percent').optional().isFloat({ min: 0, max: 100 }),
  body('employee_limit').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  body('is_demo').optional().isBoolean(),
  body('module_ids').optional().isArray(),
  body('module_ids.*').optional().isInt({ min: 1 })
];

const assignSubscriptionValidation = [
  body('package_id').isInt({ min: 1 }).withMessage('package_id is required'),
  body('billing_cycle').optional().isIn(['MONTHLY', 'ANNUAL']),
  body('started_at').optional().isISO8601().withMessage('started_at must be valid date')
];

const createInvoiceValidation = [
  body('organization_id').isInt({ min: 1 }).withMessage('organization_id is required'),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be non-negative'),
  body('currency').optional().trim().isLength({ max: 3 }),
  body('subscription_id').optional().isInt({ min: 1 }),
  body('package_id').optional().isInt({ min: 1 }),
  body('billing_cycle').optional().isIn(['MONTHLY', 'ANNUAL']),
  body('period_start').optional().isDate(),
  body('period_end').optional().isDate(),
  body('due_date').optional().isDate()
];

const markInvoicePaidValidation = [
  body('paid_at').optional().isISO8601()
];

const assignEmployeeModulesValidation = [
  body('module_ids').isArray().withMessage('module_ids must be an array'),
  body('module_ids.*').isInt({ min: 1 }).withMessage('Each module_id must be a positive integer')
];

const createClientValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('address').optional().trim(),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('category').optional().isIn(['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'VIP']),
  body('status').optional().isIn(['ACTIVE', 'CLOSED', 'BLACKLISTED']),
  body('notes').optional().trim(),
  body('assigned_to').optional().isInt({ min: 1 }),
  body('tag_ids').optional().isArray(),
  body('tag_ids.*').optional().isInt({ min: 1 }),
  body('opponents').optional().isArray(),
  body('opponents.*.name').optional().trim().isLength({ max: 255 }),
  body('opponents.*.phone').optional().trim().isLength({ max: 50 }),
  body('opponents.*.address').optional().trim(),
  body('opponents.*.notes').optional().trim()
];

const updateClientValidation = [
  body('name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('address').optional().trim(),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('category').optional().isIn(['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'VIP']),
  body('status').optional().isIn(['ACTIVE', 'CLOSED', 'BLACKLISTED']),
  body('notes').optional().trim(),
  body('assigned_to').optional().isInt({ min: 1 }).withMessage('assigned_to must be positive integer or null')
];

const assignClientValidation = [
  body('assigned_to').isInt({ min: 1 }).withMessage('assigned_to is required and must be positive integer')
];

const addOpponentValidation = [
  body('name').optional().trim().isLength({ max: 255 }),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('address').optional().trim(),
  body('notes').optional().trim()
];

const createTagValidation = [
  body('name').trim().notEmpty().withMessage('Tag name is required').isLength({ max: 100 })
];

const assignTagValidation = [
  body('tag_id').isInt({ min: 1 }).withMessage('tag_id is required')
];

const createCaseValidation = [
  body('client_id').isInt({ min: 1 }).withMessage('client_id is required'),
  body('case_title').trim().notEmpty().withMessage('Case title is required').isLength({ max: 255 }),
  body('case_number').optional().trim().isLength({ max: 50 }),
  body('court_id').optional().isInt({ min: 1 }),
  body('bench_id').optional().isInt({ min: 1 }),
  body('judge_id').optional().isInt({ min: 1 }),
  body('courtroom_id').optional().isInt({ min: 1 }),
  body('case_type').optional().isIn(['CIVIL', 'CRIMINAL', 'CORPORATE', 'TAX', 'FAMILY', 'OTHER']),
  body('status').optional().isIn(['DRAFT', 'FILED', 'HEARING', 'ARGUMENT', 'JUDGMENT', 'CLOSED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('filing_date').optional().isDate(),
  body('next_hearing_date').optional().isDate(),
  body('description').optional().trim(),
  body('assigned_to').optional().isInt({ min: 1 })
];

const updateCaseValidation = [
  body('case_title').optional().trim().notEmpty().isLength({ max: 255 }),
  body('case_number').optional().trim().isLength({ max: 50 }),
  body('court_id').optional().isInt({ min: 1 }),
  body('bench_id').optional().isInt({ min: 1 }),
  body('judge_id').optional().isInt({ min: 1 }),
  body('courtroom_id').optional().isInt({ min: 1 }),
  body('case_type').optional().isIn(['CIVIL', 'CRIMINAL', 'CORPORATE', 'TAX', 'FAMILY', 'OTHER']),
  body('status').optional().isIn(['DRAFT', 'FILED', 'HEARING', 'ARGUMENT', 'JUDGMENT', 'CLOSED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('filing_date').optional().isDate(),
  body('next_hearing_date').optional().isDate(),
  body('description').optional().trim(),
  body('assigned_to').optional().isInt({ min: 1 })
];

const addHearingValidation = [
  body('hearing_date').optional().isDate(),
  body('courtroom').optional().trim().isLength({ max: 100 }),
  body('courtroom_id').optional().isInt({ min: 1 }),
  body('judge_id').optional().isInt({ min: 1 }),
  body('bench_id').optional().isInt({ min: 1 }),
  body('remarks').optional().trim()
];

const uploadDocumentValidation = [
  body('file_name').trim().notEmpty().withMessage('file_name is required').isLength({ max: 255 }),
  body('file_path').optional().trim().isLength({ max: 500 })
];

const createHearingValidation = [
  body('case_id').isInt({ min: 1 }).withMessage('case_id is required'),
  body('hearing_date').notEmpty().withMessage('hearing_date is required').isISO8601().toDate(),
  body('courtroom').optional().trim().isLength({ max: 100 }),
  body('courtroom_id').optional().isInt({ min: 1 }),
  body('judge_id').optional().isInt({ min: 1 }),
  body('bench_id').optional().isInt({ min: 1 }),
  body('hearing_type').optional().isIn(['REGULAR', 'ARGUMENT', 'EVIDENCE', 'FINAL', 'OTHER']),
  body('status').optional().isIn(['UPCOMING', 'COMPLETED', 'ADJOURNED', 'CANCELLED']),
  body('remarks').optional().trim(),
  body('reminder_times').optional().isArray(),
  body('reminder_times.*.reminder_time').optional().isISO8601().toDate(),
  body('reminder_times.*.reminder_type').optional().isIn(['EMAIL', 'SYSTEM'])
];

const updateHearingValidation = [
  body('hearing_date').optional().isISO8601().toDate(),
  body('courtroom').optional().trim().isLength({ max: 100 }),
  body('courtroom_id').optional().isInt({ min: 1 }),
  body('judge_id').optional().isInt({ min: 1 }),
  body('bench_id').optional().isInt({ min: 1 }),
  body('hearing_type').optional().isIn(['REGULAR', 'ARGUMENT', 'EVIDENCE', 'FINAL', 'OTHER']),
  body('status').optional().isIn(['UPCOMING', 'COMPLETED', 'ADJOURNED', 'CANCELLED']),
  body('remarks').optional().trim()
];

const addReminderValidation = [
  body('reminder_time').notEmpty().isISO8601().toDate(),
  body('reminder_type').optional().isIn(['EMAIL', 'SYSTEM'])
];

const documentUploadValidation = [
  body('case_id').toInt().isInt({ min: 1 }).withMessage('case_id is required'),
  body('document_name').trim().notEmpty().withMessage('document_name is required').isLength({ max: 255 }),
  body('document_type').optional().isIn(['PETITION', 'EVIDENCE', 'AGREEMENT', 'NOTICE', 'ORDER', 'OTHER'])
];

const documentUpdateMetadataValidation = [
  body('document_name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('document_type').optional().isIn(['PETITION', 'EVIDENCE', 'AGREEMENT', 'NOTICE', 'ORDER', 'OTHER'])
];

const createCourtValidation = [
  body('court_type_id').isInt({ min: 1 }).withMessage('court_type_id is required'),
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 255 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('address').optional().trim()
];

const updateCourtValidation = [
  body('court_type_id').optional().isInt({ min: 1 }),
  body('name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('address').optional().trim(),
  body('is_active').optional().isBoolean()
];

const addBenchValidation = [ body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 255 }) ];
const updateBenchValidation = [ body('name').optional().trim().notEmpty().isLength({ max: 255 }) ];

const addJudgeValidation = [
  body('court_id').isInt({ min: 1 }).withMessage('court_id is required'),
  body('bench_id').optional().isInt({ min: 1 }),
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 255 }),
  body('designation').optional().trim().isLength({ max: 100 })
];

const updateJudgeValidation = [
  body('court_id').optional().isInt({ min: 1 }),
  body('bench_id').optional().isInt({ min: 1 }).optional({ nullable: true }),
  body('name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('designation').optional().trim().isLength({ max: 100 }),
  body('is_active').optional().isBoolean()
];

const addCourtroomValidation = [
  body('bench_id').optional().isInt({ min: 1 }),
  body('room_number').optional().trim().isLength({ max: 50 }),
  body('floor').optional().trim().isLength({ max: 50 })
];

const updateCourtroomValidation = [
  body('bench_id').optional().isInt({ min: 1 }),
  body('room_number').optional().trim().isLength({ max: 50 }),
  body('floor').optional().trim().isLength({ max: 50 })
];

const assignJudgeToCaseValidation = [ body('judge_id').optional().isInt({ min: 1 }) ];

const resetOrgAdminPasswordValidation = [
  body('new_password').notEmpty().withMessage('New password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const resetEmployeePasswordValidation = [
  body('new_password').notEmpty().withMessage('New password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

module.exports = {
  registerValidation,
  loginValidation,
  approveUserValidation,
  assignModulesValidation,
  updateUserValidation,
  superAdminLoginValidation,
  orgLoginValidation,
  createOrganizationValidation,
  updateOrganizationValidation,
  createPackageValidation,
  updatePackageValidation,
  assignSubscriptionValidation,
  createInvoiceValidation,
  markInvoicePaidValidation,
  createOrgUserValidation,
  updateOrgUserValidation,
  assignOrgModulesValidation,
  assignEmployeeModulesValidation,
  createClientValidation,
  updateClientValidation,
  assignClientValidation,
  addOpponentValidation,
  createTagValidation,
  assignTagValidation,
  createCaseValidation,
  updateCaseValidation,
  addHearingValidation,
  uploadDocumentValidation,
  createHearingValidation,
  updateHearingValidation,
  addReminderValidation,
  documentUploadValidation,
  documentUpdateMetadataValidation,
  createCourtValidation,
  updateCourtValidation,
  addBenchValidation,
  updateBenchValidation,
  addJudgeValidation,
  updateJudgeValidation,
  addCourtroomValidation,
  updateCourtroomValidation,
  assignJudgeToCaseValidation,
  resetOrgAdminPasswordValidation,
  resetEmployeePasswordValidation,
  setCasePermissionsValidation: [
    body('permissions').isArray().withMessage('permissions must be an array'),
    body('permissions.*.user_id').isInt({ min: 1 }).withMessage('Each permission must have user_id'),
    body('permissions.*.permission').isIn(['VIEW', 'EDIT', 'DELETE']).withMessage('permission must be VIEW, EDIT, or DELETE')
  ],
  createTaskValidation: [
    body('case_id').isInt({ min: 1 }).withMessage('case_id is required'),
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
    body('description').optional().trim(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
    body('due_date').optional().isDate().withMessage('Invalid due_date'),
    body('assigned_to').optional().isInt({ min: 1 })
  ],
  updateTaskValidation: [
    body('title').optional().trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('due_date').optional().isDate().withMessage('Invalid due_date')
  ],
  reassignTaskValidation: [
    body('assigned_to').optional().custom((val) => val === undefined || val === null || val === '' || (Number(val) >= 1)).withMessage('assigned_to must be a positive integer or empty')
  ]
};
