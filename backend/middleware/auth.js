const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Không có token, truy cập bị từ chối'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId)
            .populate('standardAccess', 'name code')
            .populate('criteriaAccess', 'name code')
            .select('-password -resetPasswordToken -resetPasswordExpires');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ, người dùng không tồn tại'
            });
        }

        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu hóa'
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token đã hết hạn'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi xác thực'
        });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ admin mới có quyền thực hiện thao tác này'
        });
    }
    next();
};

const requireManager = (req, res, next) => {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Cần quyền manager trở lên để thực hiện thao tác này'
        });
    }
    next();
};

const checkStandardAccess = (standardId) => {
    return (req, res, next) => {
        if (req.user.role === 'admin') {
            return next();
        }

        if (!req.user.hasStandardAccess(standardId)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập tiêu chuẩn này'
            });
        }

        next();
    };
};

const checkCriteriaAccess = (criteriaId) => {
    return (req, res, next) => {
        if (req.user.role === 'admin') {
            return next();
        }

        if (!req.user.hasCriteriaAccess(criteriaId)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập tiêu chí này'
            });
        }

        next();
    };
};

module.exports = {
    auth,
    requireAdmin,
    requireManager,
    checkStandardAccess,
    checkCriteriaAccess
};