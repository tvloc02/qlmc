const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const validation = require('../middleware/validation');
const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    updateUserStatus,
    updateUserPermissions,
    getUserStatistics
} = require('../controllers/userController');

const createUserValidation = [
    body('email')
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .custom((value) => {
            // Allow both formats: with and without @vnua.edu.vn
            const cleanEmail = value.replace('@vnua.edu.vn', '');
            if (!/^[a-zA-Z0-9]+$/.test(cleanEmail)) {
                throw new Error('Email không hợp lệ');
            }
            return true;
        }),
    body('fullName')
        .notEmpty()
        .withMessage('Họ tên là bắt buộc')
        .isLength({ min: 2, max: 100 })
        .withMessage('Họ tên phải có từ 2-100 ký tự'),
    body('phoneNumber')
        .optional()
        .matches(/^[0-9]{10,11}$/)
        .withMessage('Số điện thoại không hợp lệ'),
    body('role')
        .isIn(['admin', 'manager', 'staff'])
        .withMessage('Vai trò không hợp lệ'),
    body('department')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Phòng ban không được quá 100 ký tự'),
    body('position')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Chức vụ không được quá 100 ký tự'),
    body('standardAccess')
        .optional()
        .isArray()
        .withMessage('Quyền tiêu chuẩn phải là mảng'),
    body('criteriaAccess')
        .optional()
        .isArray()
        .withMessage('Quyền tiêu chí phải là mảng')
];

const updateUserValidation = [
    param('id').isMongoId().withMessage('ID người dùng không hợp lệ'),
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Họ tên phải có từ 2-100 ký tự'),
    body('phoneNumber')
        .optional()
        .matches(/^[0-9]{10,11}$/)
        .withMessage('Số điện thoại không hợp lệ'),
    body('role')
        .optional()
        .isIn(['admin', 'manager', 'staff'])
        .withMessage('Vai trò không hợp lệ'),
    body('department')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Phòng ban không được quá 100 ký tự'),
    body('position')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Chức vụ không được quá 100 ký tự')
];

router.get('/statistics',
    auth,
    requireRole('admin', 'manager'),
    getUserStatistics
);

router.get('/', auth, requireRole('admin', 'manager'), [
    query('page').optional().isInt({ min: 1 }).withMessage('Trang phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100'),
    query('search').optional().trim().escape(),
    query('role').optional().isIn(['admin', 'manager', 'staff']),
    query('status').optional().isIn(['active', 'inactive', 'suspended']),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'fullName', 'lastLogin']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
], validation, getUsers);

router.get('/:id', auth, requireRole('admin', 'manager'), [
    param('id').isMongoId().withMessage('ID người dùng không hợp lệ')
], validation, getUserById);

router.post('/',
    auth,
    requireRole('admin'),
    createUserValidation,
    validation,
    createUser
);

router.put('/:id',
    auth,
    requireRole('admin'),
    updateUserValidation,
    validation,
    updateUser
);

router.delete('/:id', auth, requireRole('admin'), [
    param('id').isMongoId().withMessage('ID người dùng không hợp lệ')
], validation, deleteUser);

router.post('/:id/reset-password', auth, requireRole('admin'), [
    param('id').isMongoId().withMessage('ID người dùng không hợp lệ')
], validation, resetUserPassword);

router.patch('/:id/status', auth, requireRole('admin'), [
    param('id').isMongoId().withMessage('ID người dùng không hợp lệ'),
    body('status')
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Trạng thái không hợp lệ')
], validation, updateUserStatus);

router.put('/:id/permissions', auth, requireRole('admin'), [
    param('id').isMongoId().withMessage('ID người dùng không hợp lệ'),
    body('standardAccess')
        .optional()
        .isArray()
        .withMessage('Quyền tiêu chuẩn phải là mảng'),
    body('criteriaAccess')
        .optional()
        .isArray()
        .withMessage('Quyền tiêu chí phải là mảng')
], validation, updateUserPermissions);

module.exports = router;
