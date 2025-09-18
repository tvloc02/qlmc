const criteriaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên tiêu chí là bắt buộc'],
        trim: true,
        maxlength: [500, 'Tên tiêu chí không được quá 500 ký tự'],
        index: 'text'
    },

    code: {
        type: String,
        required: [true, 'Mã tiêu chí là bắt buộc'],
        trim: true,
        validate: {
            validator: function(code) {
                return /^\d{1,2}$/.test(code);
            },
            message: 'Mã tiêu chí phải là 1-2 chữ số (VD: 1, 01, 12)'
        }
    },

    description: {
        type: String,
        trim: true,
        maxlength: [3000, 'Mô tả không được quá 3000 ký tự']
    },

    standardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Standard',
        required: [true, 'Tiêu chuẩn là bắt buộc']
    },

    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: [true, 'Chương trình đánh giá là bắt buộc']
    },

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Tổ chức - cấp đánh giá là bắt buộc']
    },

    order: {
        type: Number,
        default: 1,
        min: [1, 'Thứ tự phải lớn hơn 0']
    },

    weight: {
        type: Number,
        min: [0, 'Trọng số không được âm'],
        max: [100, 'Trọng số không được vượt quá 100']
    },

    type: {
        type: String,
        enum: ['mandatory', 'optional', 'conditional'],
        default: 'mandatory'
    },

    requirements: {
        type: String,
        trim: true,
        maxlength: [2000, 'Yêu cầu không được quá 2000 ký tự']
    },

    guidelines: {
        type: String,
        trim: true,
        maxlength: [3000, 'Hướng dẫn không được quá 3000 ký tự']
    },

    indicators: [{
        name: {
            type: String,
            required: true,
            maxlength: [200, 'Tên chỉ số không được quá 200 ký tự']
        },
        description: {
            type: String,
            maxlength: [1000, 'Mô tả chỉ số không được quá 1000 ký tự']
        },
        measurementMethod: {
            type: String,
            maxlength: [500, 'Phương pháp đo không được quá 500 ký tự']
        },
        targetValue: String,
        unit: String
    }],

    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft'
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Người tạo là bắt buộc']
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    metadata: {
        totalEvidences: {
            type: Number,
            default: 0
        },
        totalFiles: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        lastEvidenceDate: Date
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

criteriaSchema.index({ standardId: 1, code: 1 }, { unique: true });
criteriaSchema.index({ standardId: 1, order: 1 });
criteriaSchema.index({ programId: 1, organizationId: 1 });
criteriaSchema.index({ status: 1 });
criteriaSchema.index({ type: 1 });
criteriaSchema.index({ name: 'text', description: 'text' });

criteriaSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

criteriaSchema.virtual('fullName').get(function() {
    return `Tiêu chí ${this.code}: ${this.name}`;
});

criteriaSchema.virtual('fullCode').get(function() {
    return `${this.standardId?.code || 'XX'}.${this.code}`;
});

criteriaSchema.virtual('url').get(function() {
    return `/criteria/${this._id}`;
});

criteriaSchema.methods.isInUse = async function() {
    const Evidence = require('./Evidence');
    const evidenceCount = await Evidence.countDocuments({ criteriaId: this._id });
    return evidenceCount > 0;
};

criteriaSchema.statics.findByStandard = function(standardId) {
    return this.find({ standardId, status: 'active' })
        .sort({ order: 1, code: 1 });
};

criteriaSchema.statics.findByProgramAndOrganization = function(programId, organizationId) {
    return this.find({ programId, organizationId, status: 'active' })
        .populate('standardId', 'name code')
        .sort({ 'standardId.code': 1, order: 1, code: 1 });
};

criteriaSchema.set('toJSON', { virtuals: true });
criteriaSchema.set('toObject', { virtuals: true });

const Criteria = mongoose.model('Criteria', criteriaSchema);

module.exports = {
    Program,
    Organization,
    Standard,
    Criteria
};