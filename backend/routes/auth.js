const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const validation = require('../middleware/validation');
const {
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    getCurrentUser,
    updateProfile
} = require('../controllers/authController');

const validateLogin = [
    body('email')
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .trim(),
    body('password')
        .notEmpty()
        .withMessage('Mật khẩu là bắt buộc')
];

const validateForgotPassword = [
    body('email')
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .trim()
];

const validateResetPassword = [
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
];

const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Mật khẩu hiện tại là bắt buộc'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
];

const validateUpdateProfile = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Họ tên phải có từ 2 đến 100 ký tự'),
    body('phoneNumber')
        .optional()
        .matches(/^[0-9]{10,11}$/)
        .withMessage('Số điện thoại không hợp lệ')
];

// Routes
router.post('/login', validateLogin, validation, login);
router.post('/logout', logout);
router.post('/forgot-password', validateForgotPassword, validation, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, validation, resetPassword);
router.post('/change-password', auth, validateChangePassword, validation, changePassword);
router.get('/me', auth, getCurrentUser);
router.put('/profile', auth, validateUpdateProfile, validation, updateProfile);

module.exports = router;