const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên tổ chức - cấp đánh giá là bắt buộc'],
        trim: true,
        maxlength: [300, 'Tên tổ chức không được quá 300 ký tự'],
        index: 'text'
    },

    code: {
        type: String,
        required: [true, 'Mã tổ chức là bắt buộc'],
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [20, 'Mã tổ chức không được quá 20 ký tự'],
        validate: {
            validator: function(code) {
                return /^[A-Z0-9\-_]+$/.test(code);
            },
            message: 'Mã tổ chức chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới'
        }
    },

    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Mô tả không được quá 2000 ký tự']
    },

    level: {
        type: String,
        enum: ['national', 'international', 'regional', 'institutional'],
        default: 'national'
    },

    type: {
        type: String,
        enum: ['government', 'education', 'professional', 'international', 'other'],
        default: 'education'
    },

    website: {
        type: String,
        validate: {
            validator: function(url) {
                if (!url) return true;
                return /^https?:\/\/.+/.test(url);
            },
            message: 'Website phải có định dạng URL hợp lệ'
        }
    },

    contactEmail: {
        type: String,
        validate: {
            validator: function(email) {
                if (!email) return true;
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Email liên hệ không hợp lệ'
        }
    },

    contactPhone: {
        type: String,
        validate: {
            validator: function(phone) {
                if (!phone) return true;
                return /^[\d\s\-\+\(\)]+$/.test(phone);
            },
            message: 'Số điện thoại không hợp lệ'
        }
    },

    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Địa chỉ không được quá 500 ký tự']
    },

    country: {
        type: String,
        default: 'Vietnam',
        maxlength: [100, 'Tên quốc gia không được quá 100 ký tự']
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
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
        totalPrograms: {
            type: Number,
            default: 0
        },
        totalStandards: {
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

organizationSchema.index({ code: 1 });
organizationSchema.index({ level: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ name: 'text', description: 'text' });

organizationSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

organizationSchema.virtual('url').get(function() {
    return `/organizations/${this._id}`;
});

organizationSchema.methods.isInUse = async function() {
    const Standard = require('./Standard');
    const Evidence = require('./Evidence');

    const [standardCount, evidenceCount] = await Promise.all([
        Standard.countDocuments({ organizationId: this._id }),
        Evidence.countDocuments({ organizationId: this._id })
    ]);

    return standardCount > 0 || evidenceCount > 0;
};

organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

const Organization = mongoose.model('Organization', organizationSchema);