const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
    // Mã minh chứng theo format: Số hộp.Mã tiêu chuẩn.Mã tiêu chí.STT minh chứng
    code: {
        type: String,
        required: [true, 'Mã minh chứng là bắt buộc'],
        unique: true,
        uppercase: true,
        validate: {
            validator: function(code) {
                // Kiểm tra format: H + số + . + số + . + số + . + số
                return /^H\d+\.\d{2}\.\d{2}\.\d{2}$/.test(code);
            },
            message: 'Mã minh chứng không đúng yêu cầu (VD: H1.01.02.04)'
        }
    },

    name: {
        type: String,
        required: [true, 'Tên minh chứng là bắt buộc'],
        trim: true,
        maxlength: [500, 'Tên minh chứng không được quá 500 ký tự']
    },

    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Mô tả không được quá 2000 ký tự']
    },

    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: [true, 'Chương trình đánh giá là bắt buộc']
    },

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Tổ chức - Cấp đánh giá là bắt buộc']
    },

    standardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Standard',
        required: [true, 'Tiêu chuẩn là bắt buộc']
    },

    criteriaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Criteria',
        required: [true, 'Tiêu chí là bắt buộc']
    },

    documentNumber: {
        type: String,
        trim: true
    },

    issueDate: {
        type: Date
    },

    effectiveDate: {
        type: Date
    },

    issuingAgency: {
        type: String,
        trim: true
    },

    documentType: {
        type: String,
        enum: ['Quyết định', 'Thông tư', 'Nghị định', 'Luật', 'Báo cáo', 'Kế hoạch', 'Khác'],
        default: 'Khác'
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'archived'],
        default: 'active'
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    files: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }],

    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Ghi chú không được quá 1000 ký tự']
    },

    tags: [String],

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    changeHistory: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'deleted', 'moved', 'copied']
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        changes: mongoose.Schema.Types.Mixed,
        description: String
    }]
});

evidenceSchema.index({ code: 1 });
evidenceSchema.index({ programId: 1, organizationId: 1 });
evidenceSchema.index({ standardId: 1 });
evidenceSchema.index({ criteriaId: 1 });
evidenceSchema.index({ name: 'text', description: 'text', documentNumber: 'text' });
evidenceSchema.index({ createdAt: -1 });
evidenceSchema.index({ status: 1 });

evidenceSchema.index({
    programId: 1,
    organizationId: 1,
    standardId: 1,
    criteriaId: 1
});

evidenceSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

evidenceSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.changeHistory.push({
            action: 'updated',
            changedBy: this.updatedBy,
            changes: this.modifiedPaths()
        });
    }
    next();
});

// Static method tạo mã minh chứng tự động
evidenceSchema.statics.generateCode = async function(standardCode, criteriaCode, boxNumber = 1) {
    const pattern = new RegExp(`^H${boxNumber}\\.${standardCode}\\.${criteriaCode}\\.(\\d{2})$`);
    const evidences = await this.find({ code: pattern }).sort({ code: -1 }).limit(1);

    let nextNumber = 1;
    if (evidences.length > 0) {
        const lastCode = evidences[0].code;
        const lastNumber = parseInt(lastCode.split('.')[3]);
        nextNumber = lastNumber + 1;
    }

    return `H${boxNumber}.${standardCode.padStart(2, '0')}.${criteriaCode.padStart(2, '0')}.${nextNumber.toString().padStart(2, '0')}`;
};

evidenceSchema.statics.advancedSearch = function(searchParams) {
    const {
        keyword,
        programId,
        organizationId,
        standardId,
        criteriaId,
        status,
        dateFrom,
        dateTo,
        documentType
    } = searchParams;

    let query = {};


    if (keyword) {
        query.$or = [
            { name: { $regex: keyword, $options: 'i' } },
            { description: { $regex: keyword, $options: 'i' } },
            { documentNumber: { $regex: keyword, $options: 'i' } },
            { code: { $regex: keyword, $options: 'i' } }
        ];
    }

    if (programId) query.programId = programId;
    if (organizationId) query.organizationId = organizationId;
    if (standardId) query.standardId = standardId;
    if (criteriaId) query.criteriaId = criteriaId;

    if (status) query.status = status;

    if (documentType) query.documentType = documentType;

    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    return this.find(query);
};

evidenceSchema.methods.copyTo = async function(targetStandardId, targetCriteriaId, newCode, userId) {
    const Evidence = this.constructor;

    const evidenceData = this.toObject();
    delete evidenceData._id;
    delete evidenceData.__v;
    delete evidenceData.createdAt;
    delete evidenceData.updatedAt;
    delete evidenceData.changeHistory;

    evidenceData.code = newCode;
    evidenceData.standardId = targetStandardId;
    evidenceData.criteriaId = targetCriteriaId;
    evidenceData.createdBy = userId;
    evidenceData.updatedBy = userId;

    evidenceData.changeHistory = [{
        action: 'copied',
        changedBy: userId,
        description: `Sao chép từ ${this.code}`,
        changes: {
            originalCode: this.code,
            originalStandardId: this.standardId,
            originalCriteriaId: this.criteriaId
        }
    }];

    return new Evidence(evidenceData);
};

evidenceSchema.methods.moveTo = async function(targetStandardId, targetCriteriaId, newCode, userId) {
    const oldCode = this.code;
    const oldStandardId = this.standardId;
    const oldCriteriaId = this.criteriaId;

    this.code = newCode;
    this.standardId = targetStandardId;
    this.criteriaId = targetCriteriaId;
    this.updatedBy = userId;

    this.changeHistory.push({
        action: 'moved',
        changedBy: userId,
        description: `Di chuyển từ ${oldCode}`,
        changes: {
            oldCode,
            oldStandardId,
            oldCriteriaId,
            newCode,
            newStandardId: targetStandardId,
            newCriteriaId: targetCriteriaId
        }
    });

    return this;
};

evidenceSchema.virtual('fileName').get(function() {
    return `${this.code}-${this.name}`;
});

evidenceSchema.set('toJSON', { virtuals: true });
evidenceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Evidence', evidenceSchema);