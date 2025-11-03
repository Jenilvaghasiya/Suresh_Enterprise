const Customers = require("../models/customer");
const CompanyProfile = require("../models/companyProfile");
const { Op } = require("sequelize");
const { isValidUserName, isValidGstNumber, isValidPhoneNumber, isValidStateCode, isValidEmail, isValidDate } = require("../utils/validator");

exports.createCustomers = async (req, res, next) => {
    try {
        const { customerName, gstNumber, stateCode, contactNumber, emailAddress, billingAddress, shippingAddress, openingBalance, openingDate, company_id } = req.body;
        if (!company_id) {
            return res.status(400).json({ error: "Company ID is required." });
        }
        const companyRecord = await CompanyProfile.findByPk(company_id);
        if (!companyRecord) {
            return res.status(400).json({ error: "Company not found." });
        }
        if (!customerName) {
            return res.status(400).json({ error: "Customer name must be required." });
        }
        if (customerName && !isValidUserName(customerName)) {
            return res.status(400).json({ error: "Customer must be in valid format." });
        }
        if (gstNumber && !isValidGstNumber(gstNumber)) {
            return res.status(400).json({ error: "Gst Number must be in valid format." });
        }
        if (stateCode && !isValidStateCode(stateCode)) {
            return res.status(400).json({ error: "State code must be in valid format." });
        }
        if (!contactNumber) {
            return res.status(400).json({ error: "Contact Number must be required" });
        }
        if (contactNumber && !isValidPhoneNumber(contactNumber)) {
            return res.status(400).json({ error: "Contact Number must be in valid format." });
        }
        if (emailAddress && !isValidEmail(emailAddress)) {
            return res.status(400).json({ error: "Email address must be in valid format" });
        }
        if (openingBalance < 0) {
            return res.status(400).json({ error: "Opening balance cannot be negative." });
        }
        if (openingDate && !isValidDate(openingDate)) {
            return res.status(400).json({ error: "Date must be in valid format" });
        }
        const customer = await Customers.create({
            customerName: customerName.trim(),
            gstNumber: gstNumber?.trim(),
            stateCode: stateCode?.trim(),
            contactNumber: contactNumber.trim(),
            emailAddress: emailAddress?.trim().toLowerCase(),
            billingAddress: billingAddress?.trim(),
            shippingAddress: shippingAddress?.trim(),
            openingBalance: openingBalance ?? 0,
            openingDate: openingDate ?? new Date(),
            company_id: company_id,
            isActive: true
        })
        res.status(201).json({ success: true, message: "Customer created successfully.", data: customer });
    } catch (error) {
        console.error("Error creating customer:", error);
        next(error);
    }
}

exports.getAllCustomers = async (req, res, next) => {
    try {
        const customers = await Customers.findAll();
        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        next(error);
    }
}

exports.getCustomerById = async (req, res, next) => {
    try {
        const customer = await Customers.findByPk(req.params.id);
        if (!customer) {
            return res.status(404).json({ success: false, error: "Customer not found." });
        }
        res.status(200).json({ success: true, data: customer });
    } catch (error) {
        console.error("Error fetching customer by id:", error);
        next(error);
    }
}

exports.updateCustomerById = async (req, res, next) => {
    try {
        const customerId = req.params.id;
        const {
            customerName,
            gstNumber,
            stateCode,
            contactNumber,
            emailAddress,
            billingAddress,
            shippingAddress,
            openingBalance,
            openingDate,
            company_id,
            isActive
        } = req.body;

        const customer = await Customers.findByPk(customerId);
        if (!customer) return res.status(404).json({ success: false, error: "Customer not found." });

        if (customerName && !isValidUserName(customerName)) return res.status(400).json({ error: "Customer name must be in valid format." });
        if (gstNumber && !isValidGstNumber(gstNumber)) return res.status(400).json({ error: "GST Number must be valid." });
        if (stateCode && !isValidStateCode(stateCode)) return res.status(400).json({ error: "State code must be valid." });
        if (contactNumber && !isValidPhoneNumber(contactNumber)) return res.status(400).json({ error: "Contact Number must be valid." });
        if (emailAddress && !isValidEmail(emailAddress)) return res.status(400).json({ error: "Email address must be valid." });
        if (openingBalance !== undefined && openingBalance < 0) return res.status(400).json({ error: "Opening balance cannot be negative." });
        if (openingDate && !isValidDate(openingDate)) return res.status(400).json({ error: "Opening date must be valid." });

        if (gstNumber) {
            const existingGst = await Customers.findOne({
                where: { gstNumber, id: { [Op.ne]: customerId } }
            });
            if (existingGst) return res.status(400).json({ success: false, error: "GST Number already exists." });
        }

        if (contactNumber) {
            const existingContact = await Customers.findOne({
                where: { contactNumber, id: { [Op.ne]: customerId } }
            });
            if (existingContact) return res.status(400).json({ success: false, error: "Contact Number already exists." });
        }

        if (emailAddress) {
            const existingEmail = await Customers.findOne({
                where: { emailAddress, id: { [Op.ne]: customerId } }
            });
            if (existingEmail) return res.status(400).json({ success: false, error: "Email address already exists." });
        }

        if (company_id !== undefined) {
            const companyRecord = await CompanyProfile.findByPk(company_id);
            if (!companyRecord) return res.status(400).json({ success: false, error: "Company not found." });
        }

        await customer.update({
            customerName: customerName?.trim() ?? customer.customerName,
            gstNumber: gstNumber?.trim() ?? customer.gstNumber,
            stateCode: stateCode?.trim() ?? customer.stateCode,
            contactNumber: contactNumber?.trim() ?? customer.contactNumber,
            emailAddress: emailAddress?.trim().toLowerCase() ?? customer.emailAddress,
            billingAddress: billingAddress?.trim() ?? customer.billingAddress,
            shippingAddress: shippingAddress?.trim() ?? customer.shippingAddress,
            openingBalance: openingBalance ?? customer.openingBalance,
            openingDate: openingDate ?? customer.openingDate,
            company_id: company_id ?? customer.company_id,
            isActive: isActive ?? customer.isActive
        });

        res.status(200).json({ success: true, message: "Customer updated successfully.", data: customer });
    } catch (error) {
        console.error("Error updating customer:", error);
        next(error);
    }
};

exports.deleteCustomerById = async (req, res, next) => {
    try {
        const customer = await Customers.findByPk(req.params.id);
        if (!customer) {
            return res.status(404).json({ success: false, error: "Customer not found." });
        }
        await customer.destroy();
        res.status(200).json({ success: true, message: "Customer deleted successfully." });
    } catch (error) {
        console.error("Error deleting customer:", error);
        next(error);
    }
}