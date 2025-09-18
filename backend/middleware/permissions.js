const checkStandardAccess = (req, res, next) => {
    const { standardId } = req.body || req.params || req.query;

    if (!standardId) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu ID tiêu chuẩn'
        });
    }

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

const checkCriteriaAccess = (req, res, next) => {
    const { criteriaId } = req.body || req.params || req.query;

    if (!criteriaId) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu ID tiêu chí'
        });
    }

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

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa đăng nhập'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập'
            });
        }

        next();
    };
};

const checkEvidenceAccess = async (req, res, next) => {
    try {
        const { id } = req.params;
        const Evidence = require('../models/Evidence');

        const evidence = await Evidence.findById(id);
        if (!evidence) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy minh chứng'
            });
        }

        if (req.user.role === 'admin') {
            req.evidence = evidence;
            return next();
        }

        const hasAccess = req.user.hasStandardAccess(evidence.standardId) ||
            req.user.hasCriteriaAccess(evidence.criteriaId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập minh chứng này'
            });
        }

        req.evidence = evidence;
        next();
    } catch (error) {
        console.error('Check evidence access error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi kiểm tra quyền truy cập'
        });
    }
};

module.exports = {
    checkStandardAccess,
    checkCriteriaAccess,
    requireRole,
    checkEvidenceAccess
};