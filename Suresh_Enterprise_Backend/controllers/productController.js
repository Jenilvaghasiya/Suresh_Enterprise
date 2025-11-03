const { Category } = require("../models");
const Products = require("../models/product");
const CompanyProfile = require("../models/companyProfile");
const { isHsnCode } = require("../utils/validator");

exports.createProducts = async (req, res, next) => {
    try {
        const { productName, description, hsnCode, uom, price, category_id, company_id, isActive } = req.body;
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
        if (!productName || typeof productName !== "string" || productName.length < 2) {
            return res.status(400).json({ 
                success: false,
                error: "Your product name must be required and also valid and proper." 
            });
        }
        if (productName.trim().length > 50) {
            return res.status(400).json({ 
                success: false,
                error: "Your product name is too long." 
            });
        }
        if (description && description.trim().length > 255) {
            return res.status(400).json({ 
                success: false,
                error: "Your description is too long." 
            });
        }
        if (hsnCode && !isHsnCode(hsnCode)) {
            return res.status(400).json({ 
                success: false,
                error: "Please enter valid HSN code." 
            });
        }
        if (!uom || typeof uom !== "string") {
            return res.status(400).json({ 
                success: false,
                error: "UOM (Unit of Measure) is required." 
            });
        }
        if (price === undefined || Number(price) <= 0) {
            return res.status(400).json({ 
                success: false,
                error: "Price must be valid number greater than 0." 
            });
        }
        if (category_id) {
            const categoryRecord = await Category.findByPk(category_id);
            if (!categoryRecord) {
                return res.status(400).json({ 
                    success: false,
                    error: "Category not found." 
                });
            }
        }
        const product = await Products.create({
            productName: productName.trim(),
            description: description ? description.trim() : null,
            hsnCode: hsnCode || null,
            uom: uom.trim(),
            price: Number(price),
            category_id: category_id || null,
            company_id: company_id,
            isActive: isActive !== undefined ? isActive : true,
        });
        res.status(201).json({ 
            success: true,
            message: "Product created successfully.",
            data: product 
        });
    } catch (error) {
        console.error("Error creating product:", error);
        next(error);
    }
};

exports.getAllProducts = async (req, res, next) => {
    try {
        const products = await Products.findAll({
            include: [{
                model: Category,
                attributes: ['id', 'name', 'isActive']
            }]
        });
        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        next(error);
    }
};

exports.getProductById = async (req, res, next) => {
    try {
        const product = await Products.findByPk(req.params.id, {
            include: [{
                model: Category,
                attributes: ['id', 'name', 'isActive']
            }]
        });
        if (!product) {
            return res.status(404).json({ 
                success: false,
                error: "Product not found." 
            });
        }
        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error("Error fetching product by id:", error);
        next(error);
    }
};

exports.updateProductById = async (req, res, next) => {
    try {
        const { productName, description, hsnCode, uom, price, category_id, company_id, isActive } = req.body;

        const product = await Products.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                error: "Product not found." 
            });
        }

        if (productName !== undefined) {
            if (typeof productName !== "string" || productName.trim().length < 2) {
                return res.status(400).json({ 
                    success: false,
                    error: "Product name must be at least 2 characters long." 
                });
            }
            if (productName.trim().length > 50) {
                return res.status(400).json({ 
                    success: false,
                    error: "Product name is too long (max 50 characters)." 
                });
            }
        }

        if (description !== undefined && description.trim().length > 255) {
            return res.status(400).json({ 
                success: false,
                error: "Description is too long (max 255 characters)." 
            });
        }

        if (hsnCode !== undefined && !isHsnCode(hsnCode)) {
            return res.status(400).json({ 
                success: false,
                error: "Invalid HSN Code." 
            });
        }

        if (price !== undefined && (!isFinite(price) || Number(price) <= 0)) {
            return res.status(400).json({ 
                success: false,
                error: "Price must be a positive number." 
            });
        }

        if (category_id !== undefined) {
            const categoryRecord = await Category.findByPk(category_id);
            if (!categoryRecord) {
                return res.status(400).json({ 
                    success: false,
                    error: "Category not found." 
                });
            }
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

        await product.update({
            productName: productName ?? product.productName,
            description: description ?? product.description,
            hsnCode: hsnCode ?? product.hsnCode,
            uom: uom ?? product.uom,
            price: price ?? product.price,
            category_id: category_id ?? product.category_id,
            company_id: company_id ?? product.company_id,
            isActive: isActive ?? product.isActive,
        });

        return res.status(200).json({ 
            success: true,
            message: "Product updated successfully.",
            data: product 
        });
    } catch (error) {
        console.error("Error updating product:", error);
        next(error);
    }
};

exports.deleteProductById = async (req, res, next) => {
    try {
        const product = await Products.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                error: "Product not found." 
            });
        }
        await product.destroy();
        res.status(200).json({ 
            success: true,
            message: "Product deleted successfully." 
        });
    } catch (error) {
        console.error("Error deleting product:", error);
        next(error);
    }
};