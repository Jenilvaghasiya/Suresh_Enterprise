const Customers = require("../models/customer");
const CompanyProfiles = require("../models/companyProfile");
const Invoices = require("../models/invoice");
const Payments = require("../models/payment");
const ledgerPdfService = require("../service/ledgerPdfService");

exports.generateLedgerPDF = async (req, res, next) => {
  try {
    const { customerId, companyProfileId, fromDate, toDate } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, error: "customerId is required" });
    }

    const customer = await Customers.findByPk(customerId);
    if (!customer) return res.status(404).json({ success: false, error: "Customer not found" });

    let company = null;
    if (companyProfileId) {
      company = await CompanyProfiles.findByPk(companyProfileId);
      if (!company) return res.status(404).json({ success: false, error: "Company not found" });
    }

    // Fetch invoices and payments for the customer; optionally filter by companyProfileId if provided
    const whereInv = { customerId };
    if (companyProfileId) whereInv.companyProfileId = companyProfileId;
    const invoices = await Invoices.findAll({ where: whereInv, order: [["billDate", "ASC"]] });

    const wherePay = { customerId };
    if (companyProfileId) wherePay.companyProfileId = companyProfileId;
    const payments = await Payments.findAll({ where: wherePay, order: [["createdAt", "ASC"]] });

    const payload = {
      company: company ? {
        name: company.companyName,
        address: company.companyAddress,
        gstin: company.companyGstNumber
      } : {},
      customer: {
        name: customer.customerName,
        companyName: null,
        address: customer.billingAddress,
        gstin: customer.gstNumber
      },
      invoices: invoices.map(inv => inv.get ? inv.get({ plain: true }) : inv),
      payments: payments.map(p => p.get ? p.get({ plain: true }) : p),
      fromDate,
      toDate,
      dateRange: fromDate && toDate ? `${new Date(fromDate).toLocaleDateString('en-GB')} - ${new Date(toDate).toLocaleDateString('en-GB')}` : null,
      openingBalance: customer.openingBalance || 0
    };

    const pdfBuffer = await ledgerPdfService.generateLedgerPDF(payload);

    const safeName = String(customer.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ledger_${safeName}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("generateLedgerPDF error", err);
    next(err);
  }
};
