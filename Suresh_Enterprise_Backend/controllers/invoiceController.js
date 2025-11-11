const { Sequelize, Transaction } = require("sequelize");
const Invoices = require("../models/invoice");
const InvoiceItems = require("../models/invoiceItems");
const Customers = require("../models/customer");
const CompanyProfiles = require("../models/companyProfile");
const Products = require("../models/product");
const sequelize = require("../config/db");
const pdfService = require("../service/pdfService")
const billReportPdfService = require("../service/billReportPdfService");
const {
    isValidBillDate,
    isValidUom,
    isValidAmount,
    isHsnCode,
} = require("../utils/validator");


// Helper function to calculate financial year
function calculateFinancialYear(billDate) {
    const date = new Date(billDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month < 4) {
        const startYear = String(year - 1).slice(-2);
        const endYear = String(year).slice(-2);
        return startYear + endYear;
    } else {
        const startYear = String(year).slice(-2);
        const endYear = String(year + 1).slice(-2);
        return startYear + endYear;
    }
}

exports.createInvoice = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        let {
  user_id,
  customerId,
  companyProfileId,
  billDate,
  deliveryAt,
  transport,
  lrNumber,
  totalAssesValue = 0,
  sgstAmount = 0,
  cgstAmount = 0,
  igstAmount = 0,
  items,
  isActive = true,
} = req.body;

        // Auto-generate a 6-digit sequential invoice number starting from 000001
        // Use raw query with FOR UPDATE lock to prevent race conditions
        const [maxInvoiceResult] = await sequelize.query(
            `SELECT invoiceNumber FROM invoices ORDER BY CAST(invoiceNumber AS UNSIGNED) DESC LIMIT 1 FOR UPDATE`,
            { 
                transaction: t,
                type: sequelize.QueryTypes.SELECT 
            }
        );

        let nextInvoiceNumber = "1";
        if (maxInvoiceResult && maxInvoiceResult.invoiceNumber) {
            const lastNum = parseInt(maxInvoiceResult.invoiceNumber, 10);
            if (!isNaN(lastNum)) {
                const inc = lastNum + 1;
                if (inc > 999999) {
                    await t.rollback();
                    return res.status(400).json({ 
                        success: false, 
                        error: "Invoice number limit reached (999999)." 
                    });
                }
                nextInvoiceNumber = String(inc);
            }
        }

        // --- All validations are correct ---
        if (!customerId) {
            await t.rollback();
            return res.status(400).json({ success: false, error: "Customer ID is required." });
        }
        const customerExists = await Customers.findByPk(customerId, { transaction: t });
        if (!customerExists) {
            await t.rollback();
            return res.status(400).json({ success: false, error: "Invalid Customer ID." });
        }
        if (!companyProfileId) {
            await t.rollback();
            return res.status(400).json({ success: false, error: "Company Profile ID is required." });
        }
        const companyExists = await CompanyProfiles.findByPk(companyProfileId, { transaction: t });
        if (!companyExists) {
            await t.rollback();
            return res.status(400).json({ success: false, error: "Invalid Company Profile ID." });
        }
        if (!billDate) {
            await t.rollback();
            return res.status(400).json({ success: false, error: "Bill date is required." });
        }
        if (!isValidBillDate(billDate)) {
            await t.rollback();
            return res.status(400).json({ success: false, error: "Invalid Bill date format." });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, error: "At least one invoice item is required." });
        }
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.productId) {
                await t.rollback();
                return res.status(400).json({ success: false, error: `Product ID required for item ${i + 1}` });
            }
            if (!item.uom || !isValidUom(item.uom)) {
                await t.rollback();
                return res.status(400).json({ success: false, error: `Invalid UOM for product ${item.productId}` });
            }
            if (!isValidAmount(item.rate)) {
                await t.rollback();
                return res.status(400).json({ success: false, error: `Invalid rate for product ${item.productId}` });
            }
            if (item.hsnCode && !isHsnCode(item.hsnCode)) {
                await t.rollback();
                return res.status(400).json({ success: false, error: `Invalid HSN code for product ${item.productId}` });
            }
        }

        // Ensure all productIds exist before creating invoice items
        const uniqueProductIds = [...new Set(items.map(it => it.productId))];
        const existingProducts = await Products.findAll({
            where: { id: uniqueProductIds },
            attributes: ['id'],
            transaction: t
        });
        const existingIds = new Set(existingProducts.map(p => p.id));
        const missingIds = uniqueProductIds.filter(id => !existingIds.has(id));
        if (missingIds.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: `Invalid productId(s): ${missingIds.join(', ')}`
            });
        }
        // --- End of validations ---

        // Calculate billYear from billDate
        const billYear = calculateFinancialYear(billDate);

        // Determine GST flag based on tax amounts
        const gstFlag = (Number(sgstAmount || 0) + Number(cgstAmount || 0) + Number(igstAmount || 0)) > 0 ? 1 : 0;

        // Generate billNumber with separate sequence for GST vs non-GST, per company and financial year
        // Lock rows to avoid race conditions
        const [maxBillRow] = await sequelize.query(
            `SELECT billNumber FROM invoices
             WHERE companyProfileId = :companyProfileId AND billYear = :billYear AND gst = :gst
             ORDER BY CAST(REPLACE(billNumber, '.', '') AS UNSIGNED) DESC
             LIMIT 1 FOR UPDATE`,
            {
                transaction: t,
                type: sequelize.QueryTypes.SELECT,
                replacements: { companyProfileId, billYear, gst: gstFlag }
            }
        );

        let nextBillNum = 1;
        if (maxBillRow && maxBillRow.billNumber) {
            const lastBillNumeric = parseInt(String(maxBillRow.billNumber).replace(/\./g, ''), 10);
            if (!isNaN(lastBillNumeric)) nextBillNum = lastBillNumeric + 1;
        }

        const formatNonGst = (n) => String(n).split('').join('.');
        const billNumber = gstFlag === 1 ? String(nextBillNum) : formatNonGst(nextBillNum);

        const invoice = await Invoices.create(
            {
                invoiceNumber: nextInvoiceNumber,
                billNumber,
                customerId,
                companyProfileId,
                user_id,
                billDate,
                billYear,
                deliveryAt,
                transport,
                lrNumber,
                totalAssesValue: Number(totalAssesValue) || 0,
                sgstAmount: Number(sgstAmount) || 0,
                cgstAmount: Number(cgstAmount) || 0,
                igstAmount: Number(igstAmount) || 0,
                gst: gstFlag,
                billValue: Number(totalAssesValue || 0) + Number(sgstAmount || 0) + Number(cgstAmount || 0) + Number(igstAmount || 0),
                isActive,
            },
            { transaction: t }
        );

        await InvoiceItems.bulkCreate(
            items.map(item => ({
                invoiceId: invoice.id,
                productId: item.productId,
                hsnCode: item.hsnCode || null,
                uom: item.uom,
                quantity: item.quantity || 1,
                rate: item.rate,
                amount: item.rate * (item.quantity || 1),
            })),
            { transaction: t }
        );

        await t.commit();

        const createdInvoice = await Invoices.findByPk(invoice.id, {
            include: [
                { model: Customers },
                { model: CompanyProfiles },
                { model: InvoiceItems, as: "invoiceItems", include: [{ model: Products, as: "product" }] },
            ],
        });

        res.status(201).json({
            success: true,
            message: "Invoice created successfully.",
            data: createdInvoice
        });
    } catch (error) {
        await t.rollback();
        console.error("Error creating invoice:", error);
        next(error);
    }
};

// Generate consolidated Bill Report PDF
exports.generateBillReportPDF = async (req, res, next) => {
    try {
        const { fromDate, toDate, customerIds = [], status } = req.body || {};

        // Build where clause
        const where = {};
        if (fromDate || toDate) {
            where.billDate = {};
            if (fromDate) where.billDate[Sequelize.Op.gte] = new Date(fromDate);
            if (toDate) where.billDate[Sequelize.Op.lte] = new Date(toDate);
        }
        if (typeof status === 'boolean') {
            where.isActive = status;
        }
        if (Array.isArray(customerIds) && customerIds.length > 0) {
            where.customerId = customerIds;
        }

        const invoices = await Invoices.findAll({
            where,
            include: [
                { model: Customers, attributes: ["id", "customerName"] },
                { model: CompanyProfiles, attributes: ["id", "companyName", "companyAddress"] },
                { model: InvoiceItems, as: "invoiceItems", attributes: ["id"] }
            ],
            order: [["billDate", "ASC"], ["id", "ASC"]]
        });

        const payload = {
            invoices: invoices.map(i => i.get({ plain: true })),
            reportTitle: "Customer Invoice Report",
            fromDate,
            toDate,
            customerNames: Array.from(new Set(invoices.map(i => i.Customer?.customerName).filter(Boolean))),
            statusFilter: typeof status === 'boolean' ? (status ? 'Active' : 'Inactive') : 'All',
            company: invoices[0]?.CompanyProfile ? {
                name: invoices[0].CompanyProfile.companyName,
                address: invoices[0].CompanyProfile.companyAddress
            } : undefined
        };

        const pdfBuffer = await billReportPdfService.generateBillReportPDF({ ...payload });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=bill-report.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error generating bill report PDF:", error);
        next(error);
    }
};

exports.getAllInvoices = async (req, res, next) => {
    try {
        const invoices = await Invoices.findAll({
            include: [
                {
                    model: Customers,
                    attributes: ["id", "customerName", "billingAddress", "gstNumber", "stateCode"]
                },
                {
                    model: CompanyProfiles,
                    attributes: ["id", "companyName", "companyGstNumber", "companyAddress", "branchName", "companyAccountNumber", "ifscCode", "invoiceTemplate"]
                },
                {
                    model: InvoiceItems,
                    as: "invoiceItems",
                    attributes: ["id", "invoiceId", "productId", "hsnCode", "uom", "quantity", "rate", "amount"],
                    include: [
                        {
                            model: Products,
                            as: "product",
                            attributes: ["id", "productName", "hsnCode", "uom", "price"]
                        }
                    ]
                }
            ],
            order: [["id", "DESC"]],
        });

        res.status(200).json({
            success: true,
            data: invoices
        });
    } catch (error) {
        console.error("Error fetching invoices:", error);
        next(error);
    }
};

exports.getInvoicesByCompanyId = async (req, res, next) => {
    try {
        const companyProfileId = req.params.id;

        // Validate company exists
        const companyExists = await CompanyProfiles.findByPk(companyProfileId);
        if (!companyExists) {
            return res.status(404).json({
                success: false,
                error: "Company not found."
            });
        }

        const invoices = await Invoices.findAll({
            where: { companyProfileId },
            include: [
                {
                    model: Customers,
                    attributes: ["id", "customerName", "billingAddress", "gstNumber", "stateCode"]
                },
                {
                    model: CompanyProfiles,
                    attributes: ["id", "companyName", "companyGstNumber", "companyAddress", "branchName", "companyAccountNumber", "ifscCode"]
                },
                {
                    model: InvoiceItems,
                    as: "invoiceItems",
                    attributes: ["id", "invoiceId", "productId", "hsnCode", "uom", "quantity", "rate", "amount"],
                    include: [
                        {
                            model: Products,
                            as: "product",
                            attributes: ["id", "productName", "hsnCode", "uom", "price"]
                        }
                    ]
                }
            ],
            order: [["id", "DESC"]],
        });

        res.status(200).json({
            success: true,
            data: invoices
        });
    } catch (error) {
        console.error("Error fetching invoices by company ID:", error);
        next(error);
    }
};

exports.getInvoicesByUserId = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const invoices = await Invoices.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Customers,
                    attributes: ["id", "customerName", "billingAddress", "gstNumber", "stateCode"]
                },
                {
                    model: CompanyProfiles,
                    attributes: ["id", "companyName", "companyGstNumber", "companyAddress", "branchName", "companyAccountNumber", "ifscCode"]
                },
                {
                    model: InvoiceItems,
                    as: "invoiceItems",
                    attributes: ["id", "invoiceId", "productId", "hsnCode", "uom", "quantity", "rate", "amount"],
                    include: [
                        {
                            model: Products,
                            as: "product",
                            attributes: ["id", "productName", "hsnCode", "uom", "price"]
                        }
                    ]
                }
            ],
            order: [["id", "DESC"]],
        });

        res.status(200).json({
            success: true,
            data: invoices
        });
    } catch (error) {
        console.error("Error fetching invoices by user ID:", error);
        next(error);
    }
};

exports.getInvoiceById = async (req, res, next) => {
    try {
        const invoice = await Invoices.findByPk(req.params.id, {
            include: [
                {
                    model: Customers,
                    attributes: ["id", "customerName", "billingAddress", "gstNumber", "stateCode"]
                },
                {
                    model: CompanyProfiles,
                    attributes: ["id", "companyName", "companyGstNumber", "companyAddress", "branchName", "companyAccountNumber", "ifscCode"]
                },
                {
                    model: InvoiceItems,
                    as: "invoiceItems",
                    attributes: ["id", "invoiceId", "productId", "hsnCode", "uom", "quantity", "rate", "amount"],
                    include: [
                        {
                            model: Products,
                            as: "product",
                            attributes: ["id", "productName", "hsnCode", "uom", "price"]
                        }
                    ]
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: "Invoice not found."
            });
        }

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        next(error);
    }
};

exports.updateInvoiceById = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { items, ...invoiceData } = req.body;
        const invoice = await Invoices.findByPk(req.params.id, { transaction: t });
        if (!invoice) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                error: "Invoice not found."
            });
        }

        if (Object.prototype.hasOwnProperty.call(invoiceData, "invoiceNumber")) {
            delete invoiceData.invoiceNumber;
        }

        if (invoiceData.billDate && !isValidBillDate(invoiceData.billDate)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: "Invalid bill date format."
            });
        }

        // Calculate billYear if billDate is being updated
        if (invoiceData.billDate) {
            invoiceData.billYear = calculateFinancialYear(invoiceData.billDate);
        }

        if (items) {
            if (!Array.isArray(items) || items.length === 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    error: "At least one invoice item is required."
                });
            }
            for (let item of items) {
                if (!item.productId) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        error: "Product ID required in items."
                    });
                }
                if (!item.uom || !isValidUom(item.uom)) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        error: `Invalid UOM for product ${item.productId}`
                    });
                }
                if (!isValidAmount(item.rate)) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        error: `Invalid rate for product ${item.productId}`
                    });
                }
                if (item.hsnCode && !isHsnCode(item.hsnCode)) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        error: `Invalid HSN Code for product ${item.productId}`
                    });
                }
            }
        }

        // If tax fields are present in the body, recompute gst flag
        const taxFieldsPresent = ["sgstAmount", "cgstAmount", "igstAmount"].some(k => Object.prototype.hasOwnProperty.call(invoiceData, k));
        if (taxFieldsPresent) {
            const s = Number(invoiceData.sgstAmount ?? invoice.sgstAmount ?? 0);
            const c = Number(invoiceData.cgstAmount ?? invoice.cgstAmount ?? 0);
            const i = Number(invoiceData.igstAmount ?? invoice.igstAmount ?? 0);
            invoiceData.gst = (s + c + i) > 0 ? 1 : 0;
        }

        await invoice.update(invoiceData, { transaction: t });

        if (items) {
            await InvoiceItems.destroy({ where: { invoiceId: invoice.id }, transaction: t });

            let totalAssesValue = 0;
            const itemsToCreate = items.map(item => {
                const amount = item.rate * (item.quantity || 1);
                totalAssesValue += amount;
                return {
                    invoiceId: invoice.id,
                    productId: item.productId,
                    hsnCode: item.hsnCode || null,
                    uom: item.uom,
                    quantity: item.quantity || 1,
                    rate: item.rate,
                    amount: amount,
                };
            });

            await InvoiceItems.bulkCreate(itemsToCreate, { transaction: t });

            const sgstAmount = invoiceData.sgstAmount ?? invoice.sgstAmount ?? 0;
            const cgstAmount = invoiceData.cgstAmount ?? invoice.cgstAmount ?? 0;
            const igstAmount = invoiceData.igstAmount ?? invoice.igstAmount ?? 0;
            const billValue = Number(totalAssesValue) + Number(sgstAmount) + Number(cgstAmount) + Number(igstAmount);
            const gst = (Number(sgstAmount) + Number(cgstAmount) + Number(igstAmount)) > 0 ? 1 : 0;

            await invoice.update({ totalAssesValue, billValue, gst }, { transaction: t });
        }

        await t.commit();

        await invoice.reload({
            include: [
                { model: Customers },
                { model: CompanyProfiles },
                { model: InvoiceItems, as: "invoiceItems", include: [{ model: Products, as: "product" }] }
            ]
        });

        res.status(200).json({
            success: true,
            message: "Invoice updated successfully.",
            data: invoice
        });

    } catch (error) {
        await t.rollback();
        console.error("Error updating invoice:", error);
        next(error);
    }
};

exports.deleteInvoiceById = async (req, res, next) => {
    try {
        const invoice = await Invoices.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: "Invoice not found."
            });
        }

        await invoice.update({ isActive: false });

        res.status(200).json({
            success: true,
            message: "Invoice deactivated successfully.",
            id: req.params.id
        });
    } catch (error) {
        console.error("Error deleting invoice:", error);
        next(error);
    }
};

exports.generateInvoicePDF = async (req, res, next) => {
    try {
        const { copyType = 'Original' } = req.query;
        
        const invoice = await Invoices.findByPk(req.params.id, {
            include: [
                {
                    model: Customers,
                    attributes: ["id", "customerName", "billingAddress", "gstNumber", "stateCode"]
                },
                {
                    model: CompanyProfiles,
                    attributes: ["id", "companyName", "companyGstNumber", "companyAddress", "branchName", "companyAccountNumber", "ifscCode"]
                },
                {
                    model: InvoiceItems,
                    as: "invoiceItems",
                    attributes: ["id", "invoiceId", "productId", "hsnCode", "uom", "quantity", "rate", "amount"],
                    include: [
                        {
                            model: Products,
                            as: "product",
                            attributes: ["id", "productName", "hsnCode", "uom", "price"]
                        }
                    ]
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: "Invoice not found."
            });
        }

        // Fallback: if associations failed (e.g., FK type mismatch), fetch explicitly
        if (!invoice.CompanyProfile) {
            const rawCompId = invoice.companyProfileId != null ? String(invoice.companyProfileId) : '';
            const compIdPadded = rawCompId.padStart(4, '0');
            let company = null;
            if (compIdPadded) {
                company = await CompanyProfiles.findByPk(compIdPadded, {
                    attributes: ["id", "companyName", "companyGstNumber", "companyAddress", "branchName", "companyAccountNumber", "ifscCode", "invoiceTemplate"]
                });
            }
            if (!company && rawCompId) {
                company = await CompanyProfiles.findByPk(rawCompId, {
                    attributes: ["id", "companyName", "companyGstNumber", "companyAddress", "branchName", "companyAccountNumber", "ifscCode", "invoiceTemplate"]
                });
            }
            if (company) invoice.setDataValue('CompanyProfile', company);
        }
        if (!invoice.Customer && invoice.customerId) {
            const customer = await Customers.findByPk(invoice.customerId, {
                attributes: ["id", "customerName", "billingAddress", "gstNumber", "stateCode"]
            });
            if (customer) invoice.setDataValue('Customer', customer);
        }

        const pdfBuffer = await pdfService.generateBillPDF(invoice, copyType);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generating invoice PDF:", error);
        next(error);
    }
};