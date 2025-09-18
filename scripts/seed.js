const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const { Program, Organization, Standard, Criteria } = require('../models/Program');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        // Clear existing data
        await User.deleteMany({});
        await Program.deleteMany({});
        await Organization.deleteMany({});
        await Standard.deleteMany({});
        await Criteria.deleteMany({});

        const adminUser = new User({
            email: 'admin',
            fullName: 'Administrator',
            password: 'admin123',
            role: 'admin',
            status: 'active'
        });
        await adminUser.save();

        const testUser = new User({
            email: 'test',
            fullName: 'Test User',
            password: 'test123',
            role: 'staff',
            status: 'active'
        });
        await testUser.save();

        const program = new Program({
            name: 'Chương trình Đánh giá Chất lượng Giáo dục',
            code: 'DACL-2024',
            description: 'Chương trình đánh giá chất lượng giáo dục theo tiêu chuẩn quốc gia',
            type: 'undergraduate',
            version: '1.0',
            status: 'active',
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        });
        await program.save();

        const organization = new Organization({
            name: 'Học viện Nông nghiệp Việt Nam',
            code: 'VNUA',
            description: 'Học viện Nông nghiệp Việt Nam',
            level: 'national',
            type: 'education',
            status: 'active',
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        });
        await organization.save();

        const standard1 = new Standard({
            name: 'Tổ chức và quản lý',
            code: '01',
            description: 'Tiêu chuẩn về tổ chức và quản lý chương trình đào tạo',
            programId: program._id,
            organizationId: organization._id,
            order: 1,
            weight: 15,
            status: 'active',
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        });
        await standard1.save();

        const standard2 = new Standard({
            name: 'Chương trình đào tạo',
            code: '02',
            description: 'Tiêu chuẩn về chương trình đào tạo',
            programId: program._id,
            organizationId: organization._id,
            order: 2,
            weight: 20,
            status: 'active',
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        });
        await standard2.save();

        const criteria1 = new Criteria({
            name: 'Cơ cấu tổ chức',
            code: '01',
            description: 'Cơ cấu tổ chức quản lý chương trình đào tạo',
            standardId: standard1._id,
            programId: program._id,
            organizationId: organization._id,
            order: 1,
            weight: 10,
            type: 'mandatory',
            status: 'active',
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        });
        await criteria1.save();

        const criteria2 = new Criteria({
            name: 'Quy định quản lý',
            code: '02',
            description: 'Các quy định về quản lý chương trình đào tạo',
            standardId: standard1._id,
            programId: program._id,
            organizationId: organization._id,
            order: 2,
            weight: 5,
            type: 'mandatory',
            status: 'active',
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        });
        await criteria2.save();

        console.log('Seed data created successfully!');
        console.log('Admin login: admin / admin123');
        console.log('Test user login: test / test123');

    } catch (error) {
        console.error('Seed data error:', error);
    }
};

const runSeed = async () => {
    await connectDB();
    await seedData();
    process.exit(0);
};

if (require.main === module) {
    runSeed();
}

module.exports = { seedData };