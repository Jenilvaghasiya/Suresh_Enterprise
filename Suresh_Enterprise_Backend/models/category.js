const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const CompanyProfile = require("./companyProfile");

const Category = sequelize.define("Category", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    tableName: "categories",
    timestamps: true
});

CompanyProfile.hasMany(Category, { foreignKey: "company_id" });
Category.belongsTo(CompanyProfile, { foreignKey: "company_id" });

module.exports = Category;