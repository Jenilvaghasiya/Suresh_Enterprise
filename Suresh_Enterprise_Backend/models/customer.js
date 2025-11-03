const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const CompanyProfile = require("./companyProfile");

const Customers = sequelize.define("Customers", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customerName: { type: DataTypes.STRING, allowNull: false },
    gstNumber: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    stateCode: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    contactNumber: { type: DataTypes.STRING, allowNull: false },
    emailAddress: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    billingAddress: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    shippingAddress: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    openingBalance: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    openingDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: "customers",
    timestamps: true
});

CompanyProfile.hasMany(Customers, { foreignKey: "company_id" });
Customers.belongsTo(CompanyProfile, { foreignKey: "company_id" });

module.exports = Customers;