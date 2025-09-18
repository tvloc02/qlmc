const File = require('../models/File');
const Evidence = require('../models/Evidence');
const path = require('path');
const fs = require('fs');

const uploadFiles = async (req, res) => {
    try {
        const { evidenceId } = req.params;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có file nào được upload'
            });
        }

        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy minh chứng'
            });
        }

        if (req.user.role !== 'admin' &&
            !req.user.hasStandardAccess(evidence.standardId) &&
            !req.user.hasCriteriaAccess(evidence.criteriaId)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền upload file cho minh chứng này'
            });
        }

        const savedFiles = [];

        for (const file of files) {
            const storedName = File.generateStoredName(
                evidence.code,
                evidence.name,
                file.originalname
            );

            const permanentPath = path.join('uploads', 'evidences', storedName);
            const permanentDir = path.dirname(permanentPath);

            if (!fs.existsSync(permanentDir)) {
                fs.mkdirSync(permanentDir, { recursive: true });
            }

            fs.renameSync(file.path, permanentPath);

            const fileDoc = new File({
                originalName: file.originalname,
                storedName,
                filePath: permanentPath,
                size: file.size,
                mimeType: file.mimetype,
                extension: path.extname(file.originalname).toLowerCase(),
                evidenceId,
                uploadedBy: req.user.id,
                url: `/uploads/evidences/${storedName}`
            });

            await fileDoc.save();
            savedFiles.push(fileDoc);
        }

        evidence.files.push(...savedFiles.map(f => f._id));
        await evidence.save();

        res.json({
            success: true,
            message: `Upload thành công ${savedFiles.length} file`,
            data: savedFiles
        });

    } catch (error) {
        console.error('Upload files error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi upload file'
        });
    }
};

const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await File.findById(id).populate('evidenceId');
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy file'
            });
        }

        if (req.user.role !== 'admin' &&
            !req.user.hasStandardAccess(file.evidenceId.standardId) &&
            !req.user.hasCriteriaAccess(file.evidenceId.criteriaId)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền tải file này'
            });
        }

        if (!fs.existsSync(file.filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File không tồn tại trên hệ thống'
            });
        }

        await file.incrementDownloadCount();

        res.download(file.filePath, file.storedName);

    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tải file'
        });
    }
};

const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await File.findById(id).populate('evidenceId');
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy file'
            });
        }

        if (req.user.role !== 'admin' &&
            !req.user.hasStandardAccess(file.evidenceId.standardId) &&
            !req.user.hasCriteriaAccess(file.evidenceId.criteriaId)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xóa file này'
            });
        }

        // Remove file from filesystem
        if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
        }

        // Remove from evidence files array
        await Evidence.findByIdAndUpdate(
            file.evidenceId._id,
            { $pull: { files: file._id } }
        );

        // Delete file record
        await File.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Xóa file thành công'
        });

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi xóa file'
        });
    }
};

// Get file info
const getFileInfo = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await File.findById(id)
            .populate('evidenceId', 'code name')
            .populate('uploadedBy', 'fullName email');

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy file'
            });
        }

        res.json({
            success: true,
            data: file
        });

    } catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy thông tin file'
        });
    }
};

module.exports = {
    uploadFiles,
    downloadFile,
    deleteFile,
    getFileInfo
};