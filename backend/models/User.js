const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email là bắt buộc'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[a-zA-Z0-9]+$/.test(email);      },
            message: 'Email không hợp lệ (chỉ nhập phần trước @)'
        }
    },

    fullName: {
        type: String,
        required: [true, 'Họ và tên là bắt buộc'],
        maxlength: [100, 'Họ và tên không được quá 100 ký tự'],
        trim: true
    },

    password: {
        type: String,
        required: [true, 'Mật khẩu là bắt buộc'],
        minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
    },

    phoneNumber: {
        type: String,
        validate: {
            validator: function(phone) {
                return !phone || /^[0-9]{10,11}$/.test(phone);
            },
            message: 'Số điện thoại không hợp lệ'
        }
    },

    role: {
        type: String,
        enum: ['admin', 'manager', 'staff'],
        default: 'staff'
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },

    // Quyền truy cập theo tiêu chuẩn (chỉ được thao tác với minh chứng thuộc tiêu chuẩn này)
    standardAccess: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Standard'
    }],

    // Quyền truy cập theo tiêu chí (chỉ được thao tác với minh chứng thuộc tiêu chí này)
    criteriaAccess: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Criteria'
    }],

    department: String,
    position: String,

    lastLogin: Date,

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.index({ email: 1 });
userSchema.index({ fullName: 'text' });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getFullEmail = function(domain = 'cmc.edu.vn') {
    return `${this.email.split('@')[0]}@${domain}`;
};

userSchema.methods.hasStandardAccess = function(standardId) {
    if (this.role === 'admin') return true;
    return this.standardAccess.some(id => id.toString() === standardId.toString());
};

userSchema.methods.hasCriteriaAccess = function(criteriaId) {
    if (this.role === 'admin') return true;
    return this.criteriaAccess.some(id => id.toString() === criteriaId.toString());
};

// Virtual cho email đầy đủ
userSchema.methods.getEmailWithDomain = function(domain = 'cmc.edu.vn') {
    const username = this.email.split('@')[0];
    return `${username}@${domain}`;
};

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

userSchema.statics.generateDefaultPassword = function(email) {
    const firstChar = email.charAt(0).toUpperCase();
    const restChars = email.slice(1).toLowerCase();
    return `${firstChar}${restChars}@123`;
};

userSchema.statics.findByEmail = function(emailInput) {
    const username = emailInput.split('@')[0];
    return this.findOne({ email: new RegExp(`^${username}@`, 'i') });
};

module.exports = mongoose.model('User', userSchema);