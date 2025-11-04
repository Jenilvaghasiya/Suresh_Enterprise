const Payments = require("../models/payment");
const Invoices = require("../models/invoice");
const Customers = require("../models/customer");
const CompanyProfiles = require("../models/companyProfile");

exports.createPayment = async (req, res, next) => {
  try {
    const { customerId, companyProfileId, invoiceId, amount, mode_payment, remarks, cheque_date, bank_name, ifsc_code } = req.body;
    if (!customerId || !companyProfileId || !amount || !mode_payment) {
      return res.status(400).json({ success: false, error: "customerId, companyProfileId, amount and mode_payment are required." });
    }
    const customer = await Customers.findByPk(customerId);
    if (!customer) return res.status(404).json({ success: false, error: "Customer not found." });
    const company = await CompanyProfiles.findByPk(companyProfileId);
    if (!company) return res.status(404).json({ success: false, error: "Company not found." });

    const payment = await Payments.create({
      customerId,
      companyProfileId,
      invoiceId: invoiceId || null,
      amount: Number(amount),
      mode_payment,
      remarks: remarks || null,
      cheque_date: cheque_date || null,
      bank_name: bank_name || null,
      ifsc_code: ifsc_code || null,
    });

    return res.status(201).json({ success: true, message: "Payment recorded", data: payment });
  } catch (err) {
    console.error("createPayment error", err);
    next(err);
  }
};

exports.getPaymentsByCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const payments = await Payments.findAll({ where: { customerId }, order: [["id", "DESC"]] });
    return res.status(200).json({ success: true, data: payments });
  } catch (err) {
    console.error("getPaymentsByCustomer error", err);
    next(err);
  }
};

exports.getCustomerBalance = async (req, res, next) => {
  try {
    const { id } = req.params; // customer id
    const customer = await Customers.findByPk(id);
    if (!customer) return res.status(404).json({ success: false, error: "Customer not found." });

    const invoices = await Invoices.findAll({ where: { customerId: id } });
    const payments = await Payments.findAll({ where: { customerId: id } });

    const invoiceTotal = invoices.reduce((s, inv) => s + Number(inv.billValue || 0), 0);
    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const opening = Number(customer.openingBalance || 0);

    const currentBalance = opening + invoiceTotal - paid;
    return res.status(200).json({ success: true, data: { currentBalance, openingBalance: opening, invoiceTotal, paid } });
  } catch (err) {
    console.error("getCustomerBalance error", err);
    next(err);
  }
};

// Razorpay order creation
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;
    if (!amount) return res.status(400).json({ success: false, error: "amount is required" });

    const Razorpay = require("razorpay");
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return res.status(500).json({ success: false, error: "Razorpay keys not configured on server" });
    }
    const rzp = new Razorpay({ key_id, key_secret });

    const orderPayload = { amount: Math.round(Number(amount) * 100), currency, receipt: receipt || `rcpt_${Date.now()}` };
    const order = await rzp.orders.create(orderPayload);
    return res.status(200).json({ success: true, data: order, key: key_id });
  } catch (err) {
    console.error("createRazorpayOrder error", err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to create Razorpay order" });
  }
};
