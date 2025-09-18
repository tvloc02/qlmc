// controllers/programController.js
const { Program } = require('../models/Program');

const getPrograms = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
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

        if (type) query.type = type;
        if (status) query.status = status;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [programs, total] = await Promise.all([
            Program.find(query)
                .populate('createdBy', 'fullName email')
                .populate('updatedBy', 'fullName email')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum),
            Program.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                programs,
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
        console.error('Get programs error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách chương trình'
        });
    }
};

// Get all programs for dropdown
const getAllPrograms = async (req, res) => {
    try {
        const programs = await Program.find({ status: 'active' })
            .select('name code type')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: programs
        });

    } catch (error) {
        console.error('Get all programs error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy danh sách chương trình'
        });
    }
};

// Get program by ID
const getProgramById = async (req, res) => {
    try {
        const { id } = req.params;

        const program = await Program.findById(id)
            .populate('createdBy', 'fullName email')
            .populate('updatedBy', 'fullName email');

        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chương trình'
            });
        }

        res.json({
            success: true,
            data: program
        });

    } catch (error) {
        console.error('Get program by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy thông tin chương trình'
        });
    }
};

const createProgram = async (req, res) => {
    try {
        const {
            name,
            code,
            description,
            type,
            version,
            applicableYear,
            effectiveDate,
            expiryDate,
            objectives,
            guidelines
        } = req.body;

        const existingProgram = await Program.findOne({ code: code.toUpperCase() });
        if (existingProgram) {
            return res.status(400).json({
                success: false,
                message: `Mã chương trình ${code} đã tồn tại`
            });
        }

        const program = new Program({
            name: name.trim(),
            code: code.toUpperCase().trim(),
            description: description?.trim(),
            type,
            version,
            applicableYear: applicableYear || new Date().getFullYear(),
            effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            objectives: objectives?.trim(),
            guidelines: guidelines?.trim(),
            createdBy: req.user.id,
            updatedBy: req.user.id
        });

        await program.save();

        await program.populate([
            { path: 'createdBy', select: 'fullName email' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Tạo chương trình thành công',
            data: program
        });

    } catch (error) {
        console.error('Create program error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo chương trình'
        });
    }
};

const updateProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const program = await Program.findById(id);
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chương trình'
            });
        }

        if (updateData.code && updateData.code.toUpperCase() !== program.code) {
            const existingProgram = await Program.findOne({
                code: updateData.code.toUpperCase(),
                _id: { $ne: id }
            });
            if (existingProgram) {
                return res.status(400).json({
                    success: false,
                    message: `Mã chương trình ${updateData.code} đã tồn tại`
                });
            }
        }

        const isInUse = await program.isInUse();
        if (isInUse && (updateData.code || updateData.type)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể thay đổi mã hoặc loại chương trình đang được sử dụng'
            });
        }

        Object.assign(program, updateData);
        program.updatedBy = req.user.id;

        if (updateData.code) {
            program.code = updateData.code.toUpperCase();
        }

        await program.save();

        await program.populate([
            { path: 'createdBy', select: 'fullName email' },
            { path: 'updatedBy', select: 'fullName email' }
        ]);

        res.json({
            success: true,
            message: 'Cập nhật chương trình thành công',
            data: program
        });

    } catch (error) {
        console.error('Update program error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật chương trình'
        });
    }
};

const deleteProgram = async (req, res) => {
    try {
        const { id } = req.params;

        const program = await Program.findById(id);
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chương trình'
            });
        }

        // Check if program is in use
        const isInUse = await program.isInUse();
        if (isInUse) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa chương trình đang được sử dụng'
            });
        }

        await Program.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Xóa chương trình thành công'
        });

    } catch (error) {
        console.error('Delete program error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi xóa chương trình'
        });
    }
};
