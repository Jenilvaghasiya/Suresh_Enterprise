const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Category = require("./category");
const CompanyProfile = require("./companyProfile");

const Products = sequelize.define("Products", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productName: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    hsnCode: { type: DataTypes.STRING, allowNull: true },
    uom: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: "products",
    timestamps: true
});

Category.hasMany(Products, { foreignKey: "category_id", allowNull: true });
Products.belongsTo(Category, { foreignKey: "category_id" });

CompanyProfile.hasMany(Products, { foreignKey: "company_id" });
Products.belongsTo(CompanyProfile, { foreignKey: "company_id" });

module.exports = Products;