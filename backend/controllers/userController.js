const User = require('../models/User');

const getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            role,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let query = {};

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) query.role = role;
        if (status) query.status = status;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [users, total] = await Promise.all([
            User.find(query)
                .populate('standardAccess', 'name code')
                .populate('criteriaAccess', 'name code')
                .select('-password -resetPasswordToken -resetPasswordExpires')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current: pageNum,
                    pages: Math.ceil(total / limitNum),
                    total,
                    hasNext: pageNum * limitNum < total,
                    hasPrev: pageNum > 1
                }
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách người dùng'
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .populate('standardAccess', 'name code')
            .populate('criteriaAccess', 'name code')
            .select('-password -resetPasswordToken -resetPasswordExpires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy thông tin người dùng'
        });
    }
};

const createUser = async (req, res) => {
    try {
        const {
            email,
            fullName,
            phoneNumber,
            role,
            department,
            position,
            standardAccess,
            criteriaAccess
        } = req.body;

        // Clean email (remove domain if provided)
        const cleanEmail = email.replace('@vnua.edu.vn', '').toLowerCase();

        const existingUser = await User.findOne({
            email: new RegExp(`^${cleanEmail}`, 'i')
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã tồn tại trong hệ thống'
            });
        }

        // Generate default password
        const defaultPassword = User.generateDefaultPassword(cleanEmail);

        const user = new User({
            email: cleanEmail,
            fullName: fullName.trim(),
            password: defaultPassword,
            phoneNumber: phoneNumber?.trim(),
            role,
            department: department?.trim(),
            position: position?.trim(),
            standardAccess: standardAccess || [],
            criteriaAccess: criteriaAccess || [],
            status: 'active'
        });

        await user.save();

        await user.populate([
            { path: 'standardAccess', select: 'name code' },
            { path: 'criteriaAccess', select: 'name code' }
        ]);

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Tạo người dùng thành công',
            data: {
                user: userResponse,
                defaultPassword
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo người dùng'
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Update allowed fields
        const allowedFields = ['fullName', 'phoneNumber', 'role', 'department', 'position'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                user[field] = updateData[field];
            }
        });

        await user.save();

        await user.populate([
            { path: 'standardAccess', select: 'name code' },
            { path: 'criteriaAccess', select: 'name code' }
        ]);

        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.resetPasswordToken;
        delete userResponse.resetPasswordExpires;

        res.json({
            success: true,
            message: 'Cập nhật người dùng thành công',
            data: userResponse
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật người dùng'
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản của chính mình'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Xóa người dùng thành công'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi xóa người dùng'
        });
    }
};

const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const newPassword = User.generateDefaultPassword(user.email);
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Reset mật khẩu thành công',
            data: {
                newPassword
            }
        });

    } catch (error) {
        console.error('Reset user password error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi reset mật khẩu'
        });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (id === req.user.id && status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Không thể thay đổi trạng thái tài khoản của chính mình'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        user.status = status;
        await user.save();

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công',
            data: { status }
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật trạng thái'
        });
    }
};

const updateUserPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { standardAccess, criteriaAccess } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (standardAccess !== undefined) {
            user.standardAccess = standardAccess;
        }
        if (criteriaAccess !== undefined) {
            user.criteriaAccess = criteriaAccess;
        }

        await user.save();

        await user.populate([
            { path: 'standardAccess', select: 'name code' },
            { path: 'criteriaAccess', select: 'name code' }
        ]);

        res.json({
            success: true,
            message: 'Cập nhật quyền truy cập thành công',
            data: {
                standardAccess: user.standardAccess,
                criteriaAccess: user.criteriaAccess
            }
        });

    } catch (error) {
        console.error('Update user permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật quyền truy cập'
        });
    }
};

const getUserStatistics = async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    activeUsers: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    adminUsers: {
                        $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
                    },
                    managerUsers: {
                        $sum: { $cond: [{ $eq: ['$role', 'manager'] }, 1, 0] }
                    },
                    staffUsers: {
                        $sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] }
                    }
                }
            }
        ]);

        const result = stats[0] || {
            totalUsers: 0,
            activeUsers: 0,
            adminUsers: 0,
            managerUsers: 0,
            staffUsers: 0
        };

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Get user statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy thống kê người dùng'
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    updateUserStatus,
    updateUserPermissions,
    getUserStatistics
};