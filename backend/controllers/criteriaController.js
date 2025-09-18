const { Criteria, Standard } = require('../models/Program');

const getCriteria = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            standardId,
            programId,
            organizationId,
            status,
            type,
            sortBy = 'order',
            sortOrder = 'asc'
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

        if (standardId) query.standardId = standardId;
        if (programId) query.programId = programId;
        if (organizationId) query.organizationId = organizationId;
        if (status) query.status = status;
        if (type) query.type = type;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [criteria, total] = await Promise.all([
            Criteria.find(query)
                .populate('standardId', 'name code')
                .populate('programId', 'name code')
                .populate('organizationId', 'name code')
                .populate('createdBy', 'fullName email')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum),
            Criteria.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                criteria,
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
        console.error('Get criteria error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách tiêu chí'
        });
    }
};

const getCriteriaByStandard = async (req, res) => {
    try {
        const { standardId } = req.query;

        if (!standardId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu standardId'
            });
        }

        const criteria = await Criteria.findByStandard(standardId);

        res.json({
            success: true,
            data: criteria
        });

    } catch (error) {
        console.error('Get criteria by standard error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách tiêu chí'
        });
    }
};

const createCriteria = async (req, res) => {
    try {
        const {
            name,
            code,
            description,
            standardId,
            order,
            weight,
            type,
            requirements,
            guidelines,
            indicators
        } = req.body;

        const standard = await Standard.findById(standardId)
            .populate('programId organizationId');

        if (!standard) {
            return res.status(400).json({
                success: false,
                message: 'Tiêu chuẩn không tồn tại'
            });
        }

        const existingCriteria = await Criteria.findOne({
            standardId,
            code: code.toString().padStart(2, '0')
        });

        if (existingCriteria) {
            return res.status(400).json({
                success: false,
                message: `Mã tiêu chí ${code} đã tồn tại trong tiêu chuẩn này`
            });
        }

        const criteria = new Criteria({
            name: name.trim(),
            code: code.toString().padStart(2, '0'),
            description: description?.trim(),
            standardId,
            programId: standard.programId._id,
            organizationId: standard.organizationId._id,
            order: order || 1,
            weight,
            type: type || 'mandatory',
            requirements: requirements?.trim(),
            guidelines: guidelines?.trim(),
            indicators: indicators || [],
            createdBy: req.user.id,
            updatedBy: req.user.id
        });

        await criteria.save();

        await criteria.populate([
            { path: 'standardId', select: 'name code' },
            { path: 'programId', select: 'name code' },
            { path: 'organizationId', select: 'name code' },
            { path: 'createdBy', select: 'fullName email' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Tạo tiêu chí thành công',
            data: criteria
        });

    } catch (error) {
        console.error('Create criteria error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo tiêu chí'
        });
    }
};

module.exports = {

    getPrograms,
    getAllPrograms,
    getProgramById,
    createProgram,
    updateProgram,
    deleteProgram,

    getOrganizations,
    getAllOrganizations,

    getStandards,
    getStandardsByProgramAndOrg,
    createStandard,

    getCriteria,
    getCriteriaByStandard,
    createCriteria
};