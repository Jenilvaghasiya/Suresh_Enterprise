const CompanyProfiles = require("../models/companyProfile");
const gstMastersModel = require("../models/gstMaster");
const { Op } = require("sequelize");
const { isValidUserName, isValidGstNumber, isValidAccountNumber, isValidIfscCode } = require("../utils/validator");
const fs = require("fs");
const path = require("path");

exports.createCompanyProfile = async (req, res, next) => {
    try {
        const { companyName, companyAddress, companyGstNumber, companyAccountNumber, accountHolderName, ifscCode, branchName, city, state, country, gstMasterId, isActive, invoiceTemplate } = req.body;
        const companyLogo = req.file ? `/uploads/company-logos/${req.file.filename}` : null;

        if (!companyName) {
            return res.status(400).json({ success: false, error: "Company Name is required." });
        }
        if (!isValidUserName(companyName)) {
            return res.status(400).json({ success: false, error: "Company Name must be in valid format." });
        }
        if (!companyAddress) {
            return res.status(400).json({ success: false, error: "Company address is required." });
        }
        if (companyGstNumber && !isValidGstNumber(companyGstNumber)) {
            return res.status(400).json({ success: false, error: "Company GST number must be in valid format." });
        }
        if (!companyAccountNumber) {
            return res.status(400).json({ success: false, error: "Company Account Number is required." });
        }
        if (!isValidAccountNumber(companyAccountNumber)) {
            return res.status(400).json({ success: false, error: "Company account number must be in valid format." });
        }
        if (!accountHolderName) {
            return res.status(400).json({ success: false, error: "Account holder name is required." });
        }
        if (!isValidUserName(accountHolderName)) {
            return res.status(400).json({ success: false, error: "Account holder name must be in valid format." });
        }
        if (!ifscCode) {
            return res.status(400).json({ success: false, error: "IFSC code is required." });
        }
        if (!isValidIfscCode(ifscCode)) {
            return res.status(400).json({ success: false, error: "IFSC code must be in valid format." });
        }
        if (!branchName) {
            return res.status(400).json({ success: false, error: "Branch Name is required." });
        }
        if (!city || !state || !country) {
            return res.status(400).json({ success: false, error: "City, State and Country are required." });
        }

        const existingCompany = await CompanyProfiles.findOne({ where: { companyName } });
        if (existingCompany) {
            return res.status(400).json({ success: false, error: "Company name already exists." });
        }

        if (companyGstNumber) {
            const existingGst = await CompanyProfiles.findOne({ where: { companyGstNumber } });
            if (existingGst) {
                return res.status(400).json({ success: false, error: "Company GST number already exists." });
            }
        }

        const existingAccount = await CompanyProfiles.findOne({ where: { companyAccountNumber } });
        if (existingAccount) {
            return res.status(400).json({ success: false, error: "Company account number already exists." });
        }

        let finalGstMasterId = gstMasterId;
        if (!gstMasterId) {
            const defaultGst = await gstMastersModel.findOne({ where: { gstRate: 18 } });
            if (!defaultGst) {
                return res.status(400).json({ success: false, error: "Default GST (18%) not found. Please create it in GST Master first." });
            }
            finalGstMasterId = defaultGst.id;
        } else {
            const gstExists = await gstMastersModel.findByPk(gstMasterId);
            if (!gstExists) {
                return res.status(400).json({ success: false, error: "Invalid GST Master selected." });
            }
        }

        const sequelize = CompanyProfiles.sequelize;
        const t = await sequelize.transaction();
        let companyProfile;
        try {
            const [rows] = await sequelize.query(
                "SELECT id FROM company_profiles ORDER BY id DESC LIMIT 1 FOR UPDATE",
                { transaction: t }
            );
            const row = Array.isArray(rows) ? rows[0] : rows;
            let nextId = "0001";
            if (row && row.id) {
                const lastNum = parseInt(row.id, 10);
                if (!isNaN(lastNum)) {
                    nextId = String(lastNum + 1).padStart(4, "0");
                }
            }

            companyProfile = await CompanyProfiles.create({
                id: nextId,
                companyName,
                companyAddress,
                companyGstNumber: companyGstNumber || null,
                companyAccountNumber,
                accountHolderName,
                ifscCode,
                branchName,
                city,
                state,
                country,
                gstMasterId: finalGstMasterId,
                companyLogo,
                invoiceTemplate: invoiceTemplate || undefined,
                isActive: isActive ?? true
            }, { transaction: t });

            await t.commit();

            res.status(201).json({
                success: true,
                message: "Company Profile created successfully.",
                data: companyProfile
            });
        } catch (e) {
            await t.rollback();
            throw e;
        }
    } catch (error) {
        console.error("Error creating company profile:", error);
        next(error);
    }
};

exports.getAllCompanyProfile = async (req, res, next) => {
    try {
        const filters = {};
        if (req.query.active !== undefined) {
            filters.isActive = req.query.active === "true";
        }

        const companyProfiles = await CompanyProfiles.findAll({
            where: filters,
            include: [{
                model: gstMastersModel,
                attributes: ['id', 'gstRate', 'sgstRate', 'cgstRate', 'igstRate']
            }]
        });

        res.status(200).json({
            success: true,
            data: companyProfiles
        });
    } catch (error) {
        console.error("Error fetching company profiles:", error);
        next(error);
    }
};

exports.getCompanyProfileById = async (req, res, next) => {
    try {
        const companyProfile = await CompanyProfiles.findByPk(req.params.id, {
            include: [{
                model: gstMastersModel,
                attributes: ['id', 'gstRate', 'sgstRate', 'cgstRate', 'igstRate']
            }]
        });

        if (!companyProfile) {
            return res.status(404).json({
                success: false,
                error: "Company profile not found."
            });
        }

        res.status(200).json({
            success: true,
            data: companyProfile
        });
    } catch (error) {
        console.error("Error fetching company profile by id:", error);
        next(error);
    }
};

exports.updateCompanyProfileById = async (req, res, next) => {
    try {
        const { companyName, companyAddress, companyGstNumber, companyAccountNumber, accountHolderName, ifscCode, branchName, city, state, country, gstMasterId, isActive, invoiceTemplate } = req.body;
        const companyProfile = await CompanyProfiles.findByPk(req.params.id);
        const newCompanyLogo = req.file ? `/uploads/company-logos/${req.file.filename}` : null;

        if (!companyProfile) {
            return res.status(404).json({
                success: false,
                error: "Company profile not found."
            });
        }

        if (companyName) {
            const existingCompany = await CompanyProfiles.findOne({ where: { companyName, id: { [Op.ne]: req.params.id } } });
            if (existingCompany) {
                return res.status(400).json({ success: false, error: "Company Name already exists." });
            }
            if (!isValidUserName(companyName)) {
                return res.status(400).json({ success: false, error: "Company Name must be in valid format." });
            }
        }

        if (companyGstNumber) {
            const existingGst = await CompanyProfiles.findOne({ where: { companyGstNumber, id: { [Op.ne]: req.params.id } } });
            if (existingGst) {
                return res.status(400).json({ success: false, error: "Company GST Number already exists." });
            }
            if (!isValidGstNumber(companyGstNumber)) {
                return res.status(400).json({ success: false, error: "Company GST Number must be in valid format." });
            }
        }

        if (companyAccountNumber) {
            const existingAcc = await CompanyProfiles.findOne({ where: { companyAccountNumber, id: { [Op.ne]: req.params.id } } });
            if (existingAcc) {
                return res.status(400).json({ success: false, error: "Company Account Number already exists." });
            }
            if (!isValidAccountNumber(companyAccountNumber)) {
                return res.status(400).json({ success: false, error: "Company Account Number must be in valid format." });
            }
        }

        if (accountHolderName && !isValidUserName(accountHolderName)) {
            return res.status(400).json({ success: false, error: "Account holder name must be in valid format." });
        }
        if (ifscCode && !isValidIfscCode(ifscCode)) {
            return res.status(400).json({ success: false, error: "IFSC code must be in valid format." });
        }

        let finalGstMasterId = gstMasterId ?? companyProfile.gstMasterId;
        if (gstMasterId) {
            const gstExists = await gstMastersModel.findByPk(gstMasterId);
            if (!gstExists) {
                return res.status(400).json({ success: false, error: "Invalid GST Master selected." });
            }
            finalGstMasterId = gstMasterId;
        }

        // Delete old logo if new one is uploaded
        if (newCompanyLogo && companyProfile.companyLogo) {
            const oldLogoPath = path.join(__dirname, "..", companyProfile.companyLogo);
            if (fs.existsSync(oldLogoPath)) {
                fs.unlinkSync(oldLogoPath);
            }
        }

        await companyProfile.update({
            companyName: companyName ?? companyProfile.companyName,
            companyAddress: companyAddress ?? companyProfile.companyAddress,
            companyGstNumber: companyGstNumber ?? companyProfile.companyGstNumber,
            companyAccountNumber: companyAccountNumber ?? companyProfile.companyAccountNumber,
            accountHolderName: accountHolderName ?? companyProfile.accountHolderName,
            ifscCode: ifscCode ?? companyProfile.ifscCode,
            branchName: branchName ?? companyProfile.branchName,
            city: city ?? companyProfile.city,
            state: state ?? companyProfile.state,
            country: country ?? companyProfile.country,
            gstMasterId: finalGstMasterId,
            companyLogo: newCompanyLogo ?? companyProfile.companyLogo,
            invoiceTemplate: invoiceTemplate ?? companyProfile.invoiceTemplate,
            isActive: isActive ?? companyProfile.isActive
        });

        await companyProfile.reload({
            include: [{
                model: gstMastersModel,
                attributes: ['id', 'gstRate', 'sgstRate', 'cgstRate', 'igstRate']
            }]
        });

        res.status(200).json({
            success: true,
            message: "Company profile updated successfully.",
            data: companyProfile
        });
    } catch (error) {
        console.error("Error updating company profile:", error);
        next(error);
    }
};

exports.deleteCompanyProfileById = async (req, res, next) => {
    try {
        const companyProfile = await CompanyProfiles.findByPk(req.params.id);

        if (!companyProfile) {
            return res.status(404).json({
                success: false,
                error: "Company profile not found."
            });
        }

        // Delete logo file if exists
        if (companyProfile.companyLogo) {
            const logoPath = path.join(__dirname, "..", companyProfile.companyLogo);
            if (fs.existsSync(logoPath)) {
                try {
                    fs.unlinkSync(logoPath);
                } catch (err) {
                    console.error("Error deleting logo file:", err);
                }
            }
        }

        // Actually delete the company profile from database
        await companyProfile.destroy();

        res.status(200).json({
            success: true,
            message: "Company profile deleted successfully.",
            id: req.params.id
        });
    } catch (error) {
        console.error("Error deleting company profile:", error);
        next(error);
    }
};
