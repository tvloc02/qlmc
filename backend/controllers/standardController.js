const { Standard, Program, Organization } = require('../models/Program');

// Get standards with filters
const getStandards = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            programId,
            organizationId,
            status,
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

        if (programId) query.programId = programId;
        if (organizationId) query.organizationId = organizationId;
        if (status) query.status = status;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [standards, total] = await Promise.all([
            Standard.find(query)
                .populate('programId', 'name code')
                .populate('organizationId', 'name code')
                .populate('createdBy', 'fullName email')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum),
            Standard.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                standards,
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
        console.error('Get standards error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách tiêu chuẩn'
        });
    }
};

// Get standards by program and organization
const getStandardsByProgramAndOrg = async (req, res) => {
    try {
        const { programId, organizationId } = req.query;

        if (!programId || !organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu programId hoặc organizationId'
            });
        }

        const standards = await Standard.findByProgramAndOrganization(programId, organizationId);

        res.json({
            success: true,
            data: standards
        });

    } catch (error) {
        console.error('Get standards by program and org error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách tiêu chuẩn'
        });
    }
};

// Create standard
const createStandard = async (req, res) => {
    try {
        const {
            name,
            code,
            description,
            programId,
            organizationId,
            order,
            weight,
            objectives,
            guidelines,
            evaluationCriteria
        } = req.body;

        // Check if program and organization exist
        const [program, organization] = await Promise.all([
            Program.findById(programId),
            Organization.findById(organizationId)
        ]);

        if (!program || !organization) {
            return res.status(400).json({
                success: false,
                message: 'Chương trình hoặc tổ chức không tồn tại'
            });
        }

        // Check if code already exists in this program-organization
        const existingStandard = await Standard.findOne({
            programId,
            organizationId,
            code: code.toString().padStart(2, '0')
        });

        if (existingStandard) {
            return res.status(400).json({
                success: false,
                message: `Mã tiêu chuẩn ${code} đã tồn tại trong chương trình này`
            });
        }

        const standard = new Standard({
            name: name.trim(),
            code: code.toString().padStart(2, '0'),
            description: description?.trim(),
            programId,
            organizationId,
            order: order || 1,
            weight,
            objectives: objectives?.trim(),
            guidelines: guidelines?.trim(),
            evaluationCriteria: evaluationCriteria || [],
            createdBy: req.user.id,
            updatedBy: req.user.id
        });

        await standard.save();

        await standard.populate([
            { path: 'programId', select: 'name code' },
            { path: 'organizationId', select: 'name code' },
            { path: 'createdBy', select: 'fullName email' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Tạo tiêu chuẩn thành công',
            data: standard
        });

    } catch (error) {
        console.error('Create standard error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo tiêu chuẩn'
        });
    }
};
