const { Organization } = require('../models/Program');

const getOrganizations = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            level,
            type,
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
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (level) query.level = level;
        if (type) query.type = type;
        if (status) query.status = status;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [organizations, total] = await Promise.all([
            Organization.find(query)
                .populate('createdBy', 'fullName email')
                .populate('updatedBy', 'fullName email')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum),
            Organization.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                organizations,
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
        console.error('Get organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách tổ chức'
        });
    }
};

const getAllOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find({ status: 'active' })
            .select('name code level type')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: organizations
        });

    } catch (error) {
        console.error('Get all organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách tổ chức'
        });
    }
};