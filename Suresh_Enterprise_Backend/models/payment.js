const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Customers = require("./customer");
const CompanyProfiles = require("./companyProfile");
const Invoices = require("./invoice");

const Payments = sequelize.define("Payments", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customerId: { type: DataTypes.INTEGER, allowNull: false },
  companyProfileId: { type: DataTypes.INTEGER, allowNull: false },
  invoiceId: { type: DataTypes.INTEGER, allowNull: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  mode_payment: { type: DataTypes.STRING, allowNull: false },
  remarks: { type: DataTypes.STRING, allowNull: true },
  cheque_date: { type: DataTypes.DATE, allowNull: true },
  bank_name: { type: DataTypes.STRING, allowNull: true },
  ifsc_code: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: "payments",
  timestamps: true
});

Customers.hasMany(Payments, { foreignKey: "customerId" });
Payments.belongsTo(Customers, { foreignKey: "customerId" });

CompanyProfiles.hasMany(Payments, { foreignKey: "companyProfileId" });
Payments.belongsTo(CompanyProfiles, { foreignKey: "companyProfileId" });

Invoices.hasMany(Payments, { foreignKey: "invoiceId" });
Payments.belongsTo(Invoices, { foreignKey: "invoiceId" });

module.exports = Payments;
