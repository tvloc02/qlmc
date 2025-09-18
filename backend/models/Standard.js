const standardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên tiêu chuẩn là bắt buộc'],
        trim: true,
        maxlength: [500, 'Tên tiêu chuẩn không được quá 500 ký tự'],
        index: 'text'
    },

    code: {
        type: String,
        required: [true, 'Mã tiêu chuẩn là bắt buộc'],
        trim: true,
        validate: {
            validator: function(code) {
                return /^\d{1,2}$/.test(code);
            },
            message: 'Mã tiêu chuẩn phải là 1-2 chữ số (VD: 1, 01, 12)'
        }
    },

    description: {
        type: String,
        trim: true,
        maxlength: [3000, 'Mô tả không được quá 3000 ký tự']
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

    objectives: {
        type: String,
        trim: true,
        maxlength: [2000, 'Mục tiêu không được quá 2000 ký tự']
    },

    guidelines: {
        type: String,
        trim: true,
        maxlength: [3000, 'Hướng dẫn không được quá 3000 ký tự']
    },

    evaluationCriteria: [{
        name: String,
        description: String,
        weight: Number
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
        totalCriteria: {
            type: Number,
            default: 0
        },
        totalEvidences: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
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

standardSchema.index({ programId: 1, organizationId: 1, code: 1 }, { unique: true });
standardSchema.index({ programId: 1, organizationId: 1, order: 1 });
standardSchema.index({ status: 1 });
standardSchema.index({ name: 'text', description: 'text' });

standardSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

standardSchema.virtual('fullName').get(function() {
    return `Tiêu chuẩn ${this.code}: ${this.name}`;
});

standardSchema.virtual('url').get(function() {
    return `/standards/${this._id}`;
});

standardSchema.methods.isInUse = async function() {
    const Criteria = require('./Criteria');
    const Evidence = require('./Evidence');

    const [criteriaCount, evidenceCount] = await Promise.all([
        Criteria.countDocuments({ standardId: this._id }),
        Evidence.countDocuments({ standardId: this._id })
    ]);

    return criteriaCount > 0 || evidenceCount > 0;
};

standardSchema.statics.findByProgramAndOrganization = function(programId, organizationId) {
    return this.find({ programId, organizationId, status: 'active' })
        .sort({ order: 1, code: 1 });
};

standardSchema.set('toJSON', { virtuals: true });
standardSchema.set('toObject', { virtuals: true });

const Standard = mongoose.model('Standard', standardSchema);