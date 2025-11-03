const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Invoices = require("./invoice");
const Products = require("./product");

const InvoiceItems = sequelize.define("InvoiceItems", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoiceId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    hsnCode: { type: DataTypes.STRING, allowNull: true },
    uom: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    rate: { type: DataTypes.FLOAT, allowNull: false },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        get() {
            return this.getDataValue('rate') * this.getDataValue('quantity');
        }
    },
    totalAssesValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
}, {
    tableName: "invoice_items",
    timestamps: true
});

Invoices.hasMany(InvoiceItems, { foreignKey: "invoiceId", as: "invoiceItems" });
InvoiceItems.belongsTo(Invoices, { foreignKey: "invoiceId" });

Products.hasMany(InvoiceItems, { foreignKey: "productId" });
InvoiceItems.belongsTo(Products, { foreignKey: "productId", as: "product" });

module.exports = InvoiceItems;