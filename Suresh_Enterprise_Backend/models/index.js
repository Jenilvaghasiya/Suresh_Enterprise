const sequelize = require("../config/db");
const Category = require("../models/category");
const Products = require("../models/product");
const Customers = require("../models/customer");
const gstMasters = require("../models/gstMaster");
const CompanyProfile = require("../models/companyProfile");
const Invoices = require("../models/invoice");
const InvoiceItems = require("../models/invoiceItems");

async function ensureBillNumberColumn() {
    try {
        const [rows] = await sequelize.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'billNumber'`
        );
        const exists = Array.isArray(rows) ? rows[0].cnt > 0 : rows.cnt > 0;
        if (!exists) {
            await sequelize.query(`ALTER TABLE invoices ADD COLUMN billNumber VARCHAR(10) NULL AFTER invoiceNumber`);
            console.log("Added invoices.billNumber column");
        }
    } catch (e) {
        console.log("Skipping billNumber check/alter due to error:", e.message);
    }
}

sequelize.sync()
    .then(async () => {
        await ensureBillNumberColumn();
        console.log("DataBase Sync Successfully, Also Tables are created successfully.");
    })
    .catch(error => console.log("Error in DataBase Connectivity: ", error));

module.exports = { sequelize, Category, Products, Customers, gstMasters, CompanyProfile, Invoices, InvoiceItems };
