const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const gstMasters = sequelize.define("gstMasters", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    gstRate: { type: DataTypes.FLOAT, allowNull: false },
    sgstRate: { type: DataTypes.FLOAT, allowNull: false },
    cgstRate: { type: DataTypes.FLOAT, allowNull: false },
    igstRate: { type: DataTypes.FLOAT, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: "gst_masters",
    timestamps: true
});

module.exports = gstMasters;