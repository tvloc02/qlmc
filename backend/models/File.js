const mongoose = require('mongoose');
const path = require('path');

const fileSchema = new mongoose.Schema({
    // Tên file gốc
    originalName: {
        type: String,
        required: [true, 'Tên file gốc là bắt buộc'],
        trim: true
    },


    storedName: {
        type: String,
        required: [true, 'Tên file lưu trữ là bắt buộc']
    },


    filePath: {
        type: String,
        required: [true, 'Đường dẫn file là bắt buộc'],
        validate: {
            validator: function(filePath) {
                return filePath.length <= 255;
            },
            message: 'Đường dẫn file + tên file không được quá 255 ký tự'
        }
    },


    size: {
        type: Number,
        required: [true, 'Kích thước file là bắt buộc']
    },


    mimeType: {
        type: String,
        required: [true, 'Loại file là bắt buộc']
    },


    extension: {
        type: String,
        required: [true, 'Phần mở rộng file là bắt buộc'],
        lowercase: true
    },


    type: {
        type: String,
        enum: ['file', 'folder'],
        default: 'file'
    },


    evidenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: [true, 'ID minh chứng là bắt buộc']
    },


    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Người upload là bắt buộc']
    },


    url: String,
    publicId: String,
    parentFolder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    },

    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }],

    metadata: {
        pageCount: Number,
        wordCount: Number,
        author: String,
        title: String,
        subject: String,

        dimensions: {
            width: Number,
            height: Number
        },

        hash: String
    },

    extractedContent: {
        type: String,
        index: 'text'
    },

    status: {
        type: String,
        enum: ['active', 'deleted', 'processing', 'failed'],
        default: 'active'
    },

    virusScanResult: {
        scanned: { type: Boolean, default: false },
        clean: { type: Boolean, default: true },
        scanDate: Date,
        details: String
    },

    downloadCount: {
        type: Number,
        default: 0
    },

    lastDownloaded: Date,

    uploadedAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

fileSchema.index({ evidenceId: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ originalName: 'text', extractedContent: 'text' });
fileSchema.index({ uploadedAt: -1 });
fileSchema.index({ status: 1 });
fileSchema.index({ type: 1 });

fileSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

fileSchema.statics.generateStoredName = function(evidenceCode, evidenceName, originalName) {
    const ext = path.extname(originalName);
    // Format: Mã minh chứng-Tên minh chứng.extension
    let storedName = `${evidenceCode}-${evidenceName}${ext}`;

    storedName = storedName
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (storedName.length > 255) {
        const nameWithoutExt = storedName.substring(0, storedName.lastIndexOf('.'));
        const maxNameLength = 255 - ext.length;
        storedName = nameWithoutExt.substring(0, maxNameLength) + ext;
    }

    return storedName;
};

fileSchema.methods.incrementDownloadCount = function() {
    this.downloadCount += 1;
    this.lastDownloaded = new Date();
    return this.save();
};

fileSchema.methods.getFormattedSize = function() {
    const bytes = this.size;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

fileSchema.virtual('fullName').get(function() {
    return this.storedName || this.originalName;
});

fileSchema.virtual('isImage').get(function() {
    return this.mimeType.startsWith('image/');
});

fileSchema.virtual('isPdf').get(function() {
    return this.mimeType === 'application/pdf';
});

fileSchema.virtual('isOfficeDoc').get(function() {
    const officeMimes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return officeMimes.includes(this.mimeType);
});

fileSchema.set('toJSON', { virtuals: true });
fileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('File', fileSchema);