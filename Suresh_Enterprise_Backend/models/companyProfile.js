const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const gstMasters = require("./gstMaster");

const CompanyProfiles = sequelize.define(
  "CompanyProfiles",
  {
    id: { type: DataTypes.STRING(4), primaryKey: true, allowNull: false },
    companyName: { type: DataTypes.STRING, allowNull: false },
    companyAddress: { type: DataTypes.STRING, allowNull: false },
    companyGstNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
    companyAccountNumber: { type: DataTypes.STRING, allowNull: false },
    accountHolderName: { type: DataTypes.STRING, allowNull: false },
    ifscCode: { type: DataTypes.STRING, allowNull: false },
    branchName: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
    gstMasterId: { type: DataTypes.INTEGER, allowNull: false },
    companyLogo: { type: DataTypes.STRING, allowNull: true },
    invoiceTemplate: { type: DataTypes.STRING, allowNull: true, defaultValue: 'view1' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "company_profiles",
    timestamps: true,
  }
);

gstMasters.hasMany(CompanyProfiles, { foreignKey: "gstMasterId" });
CompanyProfiles.belongsTo(gstMasters, { foreignKey: "gstMasterId" });

module.exports = CompanyProfiles;

