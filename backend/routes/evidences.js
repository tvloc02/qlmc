const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const validation = require('../middleware/validation');
const {
    getEvidences,
    getEvidenceById,
    createEvidence,
    updateEvidence,
    deleteEvidence,
    bulkDeleteEvidences,
    copyEvidence,
    moveEvidence,
    generateCode,
    getEvidenceTree,
    advancedSearch,
    bulkDownload,
    importEvidences,
    downloadImportTemplate,
    exportEvidences,
    getStatistics,
    searchInFiles
} = require('../controllers/evidenceController');

const createEvidenceValidation = [
    body('name')
        .notEmpty()
        .withMessage('Tên minh chứng là bắt buộc')
        .isLength({ max: 500 })
        .withMessage('Tên không được quá 500 ký tự'),
    body('description')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Mô tả không được quá 2000 ký tự'),
    body('programId')
        .notEmpty()
        .withMessage('Chương trình đánh giá là bắt buộc')
        .isMongoId()
        .withMessage('ID chương trình không hợp lệ'),
    body('organizationId')
        .notEmpty()
        .withMessage('Tổ chức - Cấp đánh giá là bắt buộc')
        .isMongoId()
        .withMessage('ID tổ chức không hợp lệ'),
    body('standardId')
        .notEmpty()
        .withMessage('Tiêu chuẩn là bắt buộc')
        .isMongoId()
        .withMessage('ID tiêu chuẩn không hợp lệ'),
    body('criteriaId')
        .notEmpty()
        .withMessage('Tiêu chí là bắt buộc')
        .isMongoId()
        .withMessage('ID tiêu chí không hợp lệ'),
    body('code')
        .optional()
        .matches(/^H\d+\.\d{2}\.\d{2}\.\d{2}$/)
        .withMessage('Mã minh chứng không đúng format (VD: H1.01.02.04)'),
    body('documentNumber')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Số hiệu không được quá 100 ký tự'),
    body('documentType')
        .optional()
        .isIn(['Quyết định', 'Thông tư', 'Nghị định', 'Luật', 'Báo cáo', 'Kế hoạch', 'Khác'])
        .withMessage('Loại văn bản không hợp lệ'),
    body('issuingAgency')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Cơ quan ban hành không được quá 200 ký tự'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Ghi chú không được quá 1000 ký tự')
];

const updateEvidenceValidation = [
    param('id').isMongoId().withMessage('ID minh chứng không hợp lệ'),
    ...createEvidenceValidation.filter(rule =>
        !rule.builder.fields.includes('programId') &&
        !rule.builder.fields.includes('organizationId') &&
        !rule.builder.fields.includes('standardId') &&
        !rule.builder.fields.includes('criteriaId')
    )
];

const copyMoveValidation = [
    param('id').isMongoId().withMessage('ID minh chứng không hợp lệ'),
    body('targetStandardId')
        .notEmpty()
        .withMessage('Tiêu chuẩn đích là bắt buộc')
        .isMongoId()
        .withMessage('ID tiêu chuẩn đích không hợp lệ'),
    body('targetCriteriaId')
        .notEmpty()
        .withMessage('Tiêu chí đích là bắt buộc')
        .isMongoId()
        .withMessage('ID tiêu chí đích không hợp lệ'),
    body('newCode')
        .notEmpty()
        .withMessage('Mã minh chứng mới là bắt buộc')
        .matches(/^H\d+\.\d{2}\.\d{2}\.\d{2}$/)
        .withMessage('Mã minh chứng mới không đúng format')
];

router.get('/', auth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Trang phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100'),
    query('search').optional().trim().escape(),
    query('programId').optional().isMongoId().withMessage('ID chương trình không hợp lệ'),
    query('organizationId').optional().isMongoId().withMessage('ID tổ chức không hợp lệ'),
    query('standardId').optional().isMongoId().withMessage('ID tiêu chuẩn không hợp lệ'),
    query('criteriaId').optional().isMongoId().withMessage('ID tiêu chí không hợp lệ'),
    query('status').optional().isIn(['active', 'inactive', 'pending', 'archived']),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'name', 'code']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
], validation, getEvidences);

router.get('/statistics', auth, [
    query('programId').optional().isMongoId(),
    query('organizationId').optional().isMongoId(),
    query('standardId').optional().isMongoId(),
    query('criteriaId').optional().isMongoId()
], validation, getStatistics);

router.get('/tree', auth, [
    query('programId').notEmpty().isMongoId().withMessage('ID chương trình là bắt buộc'),
    query('organizationId').notEmpty().isMongoId().withMessage('ID tổ chức là bắt buộc')
], validation, getEvidenceTree);

router.post('/advanced-search', auth, [
    body('keyword').optional().trim().escape(),
    body('programId').optional().isMongoId(),
    body('organizationId').optional().isMongoId(),
    body('standardId').optional().isMongoId(),
    body('criteriaId').optional().isMongoId(),
    body('status').optional().isIn(['active', 'inactive', 'pending', 'archived']),
    body('documentType').optional().isIn(['Quyết định', 'Thông tư', 'Nghị định', 'Luật', 'Báo cáo', 'Kế hoạch', 'Khác']),
    body('dateFrom').optional().isISO8601(),
    body('dateTo').optional().isISO8601(),
    body('page').optional().isInt({ min: 1 }),
    body('limit').optional().isInt({ min: 1, max: 100 })
], validation, advancedSearch);

router.get('/search-files', auth, [
    query('keyword').notEmpty().withMessage('Từ khóa tìm kiếm là bắt buộc').trim().escape()
], validation, searchInFiles);

router.post('/generate-code', auth, [
    body('standardCode')
        .notEmpty()
        .withMessage('Mã tiêu chuẩn là bắt buộc')
        .matches(/^\d{1,2}$/)
        .withMessage('Mã tiêu chuẩn phải là 1-2 chữ số'),
    body('criteriaCode')
        .notEmpty()
        .withMessage('Mã tiêu chí là bắt buộc')
        .matches(/^\d{1,2}$/)
        .withMessage('Mã tiêu chí phải là 1-2 chữ số'),
    body('boxNumber')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Số hộp phải là số nguyên dương')
], validation, generateCode);

router.get('/export', auth, [
    query('programId').optional().isMongoId(),
    query('organizationId').optional().isMongoId(),
    query('standardId').optional().isMongoId(),
    query('criteriaId').optional().isMongoId(),
    query('status').optional().isIn(['active', 'inactive', 'pending', 'archived']),
    query('format').optional().isIn(['xlsx', 'csv']).withMessage('Format phải là xlsx hoặc csv')
], validation, exportEvidences);

router.post('/bulk-download', auth, [
    body('ids')
        .isArray({ min: 1 })
        .withMessage('Danh sách ID là bắt buộc')
        .custom((value) => {
            return value.every(id => /^[0-9a-fA-F]{24}$/.test(id));
        })
        .withMessage('Danh sách chứa ID không hợp lệ')
], validation, bulkDownload);

router.delete('/bulk', auth, [
    body('ids')
        .isArray({ min: 1 })
        .withMessage('Danh sách ID là bắt buộc')
        .custom((value) => {
            return value.every(id => /^[0-9a-fA-F]{24}$/.test(id));
        })
        .withMessage('Danh sách chứa ID không hợp lệ')
], validation, bulkDeleteEvidences);

router.post('/import', auth, upload.single('file'), [
    body('programId').notEmpty().isMongoId().withMessage('ID chương trình là bắt buộc'),
    body('organizationId').notEmpty().isMongoId().withMessage('ID tổ chức là bắt buộc')
], validation, importEvidences);

router.get('/import-template', auth, [
    query('programId').notEmpty().isMongoId().withMessage('ID chương trình là bắt buộc'),
    query('organizationId').notEmpty().isMongoId().withMessage('ID tổ chức là bắt buộc')
], validation, downloadImportTemplate);

router.get('/:id', auth, [
    param('id').isMongoId().withMessage('ID minh chứng không hợp lệ')
], validation, getEvidenceById);

router.post('/', auth, createEvidenceValidation, validation, createEvidence);

router.put('/:id', auth, updateEvidenceValidation, validation, updateEvidence);

router.delete('/:id', auth, [
    param('id').isMongoId().withMessage('ID minh chứng không hợp lệ')
], validation, deleteEvidence);

router.post('/:id/copy', auth, copyMoveValidation, validation, copyEvidence);

router.post('/:id/move', auth, copyMoveValidation, validation, moveEvidence);

router.post('/:id/files', auth, [
    param('id').isMongoId().withMessage('ID minh chứng không hợp lệ')
], upload.array('files', 10), validation, async (req, res, next) => {
    // This will be handled by file controller
    req.evidenceId = req.params.id;
    next();
});

module.exports = router;