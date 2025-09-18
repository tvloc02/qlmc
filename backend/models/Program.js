const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên chương trình đánh giá là bắt buộc'],
        trim: true,
        maxlength: [300, 'Tên chương trình không được quá 300 ký tự'],
        index: 'text'
    },

    code: {
        type: String,
        required: [true, 'Mã chương trình là bắt buộc'],
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [20, 'Mã chương trình không được quá 20 ký tự'],
        validate: {
            validator: function(code) {
                return /^[A-Z0-9\-_]+$/.test(code);
            },
            message: 'Mã chương trình chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới'
        }
    },

    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Mô tả không được quá 2000 ký tự']
    },

    type: {
        type: String,
        enum: ['undergraduate', 'graduate', 'institution', 'other'],
        default: 'undergraduate'
    },

    version: {
        type: String,
        default: '1.0',
        maxlength: [10, 'Phiên bản không được quá 10 ký tự']
    },

    applicableYear: {
        type: Number,
        default: function() {
            return new Date().getFullYear();
        },
        min: [2000, 'Năm áp dụng không được nhỏ hơn 2000'],
        max: [2100, 'Năm áp dụng không được lớn hơn 2100']
    },

    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft'
    },

    effectiveDate: {
        type: Date
    },

    expiryDate: {
        type: Date
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
        totalStandards: {
            type: Number,
            default: 0
        },
        totalCriteria: {
            type: Number,
            default: 0
        },
        totalEvidences: {
            type: Number,
            default: 0
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

programSchema.index({ code: 1 });
programSchema.index({ status: 1 });
programSchema.index({ applicableYear: 1 });
programSchema.index({ name: 'text', description: 'text' });

programSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

programSchema.virtual('url').get(function() {
    return `/programs/${this._id}`;
});

programSchema.methods.isInUse = async function() {
    const Standard = require('./Standard');
    const Evidence = require('./Evidence');

    const [standardCount, evidenceCount] = await Promise.all([
        Standard.countDocuments({ programId: this._id }),
        Evidence.countDocuments({ programId: this._id })
    ]);

    return standardCount > 0 || evidenceCount > 0;
};

programSchema.statics.getStatistics = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    return stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
    }, {});
};

programSchema.set('toJSON', { virtuals: true });
programSchema.set('toObject', { virtuals: true });

const Program = mongoose.model('Program', programSchema);