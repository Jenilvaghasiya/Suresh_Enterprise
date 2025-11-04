const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Customers = require("./customer");
const CompanyProfiles = require("./companyProfile");

const Invoices = sequelize.define(
  "Invoices",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoiceNumber: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
    billNumber: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Per-company/year sequential bill number; separate sequence for GST and non-GST",
    },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    companyProfileId: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false, comment: "User who created this invoice" },
    billDate: { type: DataTypes.DATE, allowNull: false },
    billYear: { 
      type: DataTypes.STRING(4), 
      allowNull: false,
      comment: "Financial year in format YXYY (e.g., 2425 for FY 2024-25)"
    },
    deliveryAt: { type: DataTypes.STRING, allowNull: true },
    transport: { type: DataTypes.STRING, allowNull: true },
    lrNumber: { type: DataTypes.STRING, allowNull: true },
    totalAssesValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    sgstAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cgstAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    igstAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    gst: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0, comment: "0 = no GST, 1 = GST applied" },
    billValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: "Alias of billValue for reporting" },
    paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "invoices",
    timestamps: true,
    hooks: {
      beforeValidate: (invoice) => {
        if (invoice.billDate && !invoice.billYear) {
          invoice.billYear = calculateFinancialYear(invoice.billDate);
        }
      },
      beforeUpdate: (invoice) => {
        if (invoice.changed('billDate')) {
          invoice.billYear = calculateFinancialYear(invoice.billDate);
        }
      }
    }
  }
);

// Helper function to calculate financial year
function calculateFinancialYear(billDate) {
  const date = new Date(billDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  
  if (month < 4) {
    // Before April: use previous year as start
    const startYear = String(year - 1).slice(-2);
    const endYear = String(year).slice(-2);
    return startYear + endYear;
  } else {
    // April or after: use current year as start
    const startYear = String(year).slice(-2);
    const endYear = String(year + 1).slice(-2);
    return startYear + endYear;
  }
}

Customers.hasMany(Invoices, { foreignKey: "customerId" });
Invoices.belongsTo(Customers, { foreignKey: "customerId" });

CompanyProfiles.hasMany(Invoices, { foreignKey: "companyProfileId" });
Invoices.belongsTo(CompanyProfiles, { foreignKey: "companyProfileId" });

module.exports = Invoices;