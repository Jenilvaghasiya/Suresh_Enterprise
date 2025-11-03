const isValidPhoneNumber = (mobile) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(mobile);
};

const isValidAccountNumber = (accountNum) => {
    const regex = /^\d{9,18}$/;
    return regex.test(accountNum);
};

const isValidIfscCode = (ifscCode) => {
    const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return regex.test(ifscCode);
};

const isValidGstNumber = (gstNumber) => {
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstNumber);
};

const isHsnCode = (hsnCode) => {
    const regex = /^\d{4}(\d{2})?(\d{2})?$/;
    return regex.test(hsnCode);
};

const isValidUserName = (name) => {
    const regex = /^[A-Za-z .]+$/;
    return regex.test(name);
};

const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const isValidStateCode = (code) => {
    const regex = /^\d{2}$/;
    return regex.test(code);
};

const isValidAmount = (amount) => {
    return typeof amount === "number" && amount >= 0;
};

const isValidDate = (date) => {
    return !isNaN(Date.parse(date));
};

const isValidUom = (uom) => {
    const validUoms = ["pcs", "kg", "ltr", "mtr", "box"];
    return validUoms.includes(uom.toLowerCase());
};

const isValidInvoiceNumber = (invoiceNum) => {
    const regex = /^\d{6}$/;
    return regex.test(invoiceNum);
};

const isValidBillDate = (date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate) && parsedDate <= new Date();
};

const isValidText = (text) => {
    const regex = /^[A-Za-z0-9 .,-]+$/;
    return regex.test(text);
};

module.exports = {
    isValidPhoneNumber,
    isValidAccountNumber,
    isValidIfscCode,
    isValidGstNumber,
    isHsnCode,
    isValidUserName,
    isValidEmail,
    isValidStateCode,
    isValidAmount,
    isValidDate,
    isValidUom,
    isValidInvoiceNumber,
    isValidBillDate,
    isValidText,
};
