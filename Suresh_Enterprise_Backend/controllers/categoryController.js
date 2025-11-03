const Category = require("../models/category");
const CompanyProfile = require("../models/companyProfile");
const { Op } = require("sequelize");
const sequelize = require("../config/db");

exports.createCategory = async (req, res, next) => {
    try {
        console.log("=== CREATE CATEGORY REQUEST ===");
        console.log("Request Body:", req.body);
        console.log("Headers:", req.headers);
        
        const { name, company_id, isActive } = req.body;

        if (!company_id) {
            return res.status(400).json({
                success: false,
                error: "Company ID is required."
            });
        }
        const companyRecord = await CompanyProfile.findByPk(company_id);
        if (!companyRecord) {
            return res.status(400).json({
                success: false,
                error: "Company not found."
            });
        }
        if (!name || typeof name !== "string" || name.trim().length < 2) {
            console.log("Validation failed: name too short");
            return res.status(400).json({
                success: false,
                error: "Name must contain at least 2 characters."
            });
        }

        const existingCategory = await Category.findOne({ where: { name: name.trim() } });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: "Category with this name already exists."
            });
        }

        const category = await Category.create({
            name: name.trim(),
            company_id: company_id,
            isActive: isActive ?? true,
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category
        });
    } catch (error) {
        console.error("Error creating category: ", error);
        next(error);
    }
};

exports.getAllCategory = async (req, res, next) => {
    try {
        const categories = await Category.findAll();
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error("Error fetching categories: ", error);
        next(error);
    }
};

exports.getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found"
            });
        }
        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error("Error fetching category by id: ", error);
        next(error);
    }
};

exports.updateCategoryById = async (req, res, next) => {
    try {
        const { name, company_id, isActive } = req.body;
        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: "Name must contain at least 2 characters."
            });
        }
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found"
            });
        }
        const duplicate = await Category.findOne({
            where: {
                name: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('name')),
                    name.trim().toLowerCase()
                ),
                id: { [Op.ne]: req.params.id }
            }
        });
        if (duplicate) {
            return res.status(400).json({
                success: false,
                error: "Another category with this name already exists"
            });
        }

        if (company_id !== undefined) {
            const companyRecord = await CompanyProfile.findByPk(company_id);
            if (!companyRecord) {
                return res.status(400).json({
                    success: false,
                    error: "Company not found."
                });
            }
        }

        category.name = name.trim();
        category.company_id = company_id ?? category.company_id;
        category.isActive = isActive ?? category.isActive;

        await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category
        });
    } catch (error) {
        console.error("Error updating category: ", error);
        next(error);
    }
};

exports.deleteCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found"
            });
        }
        await category.destroy();
        res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting category: ", error);
        next(error);
    }
};