const gstMasters = require("../models/gstMaster");

exports.createGstMasters = async (req, res, next) => {
    try {
        const { gstRate, sgstRate, cgstRate, igstRate, isActive } = req.body;

        if (!gstRate || isNaN(gstRate)) {
            return res.status(400).json({
                success: false,
                error: "gstRate is required and must be a valid number."
            });
        }
        if (gstRate <= 0) {
            return res.status(400).json({
                success: false,
                error: "gstRate must be greater than 0."
            });
        }

        const calculatedSgstRate = sgstRate ?? gstRate / 2;
        const calculatedCgstRate = cgstRate ?? gstRate / 2;
        const calculatedIgstRate = igstRate ?? gstRate;

        if (calculatedSgstRate < 0 || calculatedCgstRate < 0 || calculatedIgstRate < 0) {
            return res.status(400).json({
                success: false,
                error: "GST sub-rates cannot be negative."
            });
        }

        const duplicate = await gstMasters.findOne({ where: { gstRate } });
        if (duplicate) {
            return res.status(400).json({
                success: false,
                error: "This GST rate already exists."
            });
        }

        const gstMaster = await gstMasters.create({
            gstRate,
            sgstRate: calculatedSgstRate,
            cgstRate: calculatedCgstRate,
            igstRate: calculatedIgstRate,
            isActive: isActive ?? true,
        });

        res.status(201).json({
            success: true,
            message: "GST Master created successfully.",
            data: gstMaster
        });
    } catch (error) {
        console.error("Error creating GST Master:", error);
        next(error);
    }
};

exports.getAllGstMasters = async (req, res, next) => {
    try {
        const gstMastersList = await gstMasters.findAll();
        res.status(200).json({
            success: true,
            data: gstMastersList
        });
    } catch (error) {
        console.error("Error fetching GST Masters:", error);
        next(error);
    }
};

exports.getGstMasterById = async (req, res, next) => {
    try {
        const gstMaster = await gstMasters.findByPk(req.params.id);
        if (!gstMaster) {
            return res.status(404).json({
                success: false,
                error: "GST Master not found."
            });
        }
        res.status(200).json({
            success: true,
            data: gstMaster
        });
    } catch (error) {
        console.error("Error fetching GST Master by id:", error);
        next(error);
    }
};

exports.updateGstMasterById = async (req, res, next) => {
    try {
        const { gstRate, sgstRate, cgstRate, igstRate, isActive } = req.body;

        const gstMaster = await gstMasters.findByPk(req.params.id);
        if (!gstMaster) {
            return res.status(404).json({
                success: false,
                error: "GST Master not found."
            });
        }

        if (gstRate !== undefined && (isNaN(gstRate) || gstRate <= 0)) {
            return res.status(400).json({
                success: false,
                error: "gstRate must be a valid positive number."
            });
        }
        if (sgstRate !== undefined && (isNaN(sgstRate) || sgstRate < 0)) {
            return res.status(400).json({
                success: false,
                error: "sgstRate must be a valid non-negative number."
            });
        }
        if (cgstRate !== undefined && (isNaN(cgstRate) || cgstRate < 0)) {
            return res.status(400).json({
                success: false,
                error: "cgstRate must be a valid non-negative number."
            });
        }
        if (igstRate !== undefined && (isNaN(igstRate) || igstRate < 0)) {
            return res.status(400).json({
                success: false,
                error: "igstRate must be a valid non-negative number."
            });
        }

        if (gstRate !== undefined) {
            await gstMaster.update({
                gstRate: gstRate,
                sgstRate: gstRate / 2,
                cgstRate: gstRate / 2,
                igstRate: gstRate,
                isActive: isActive ?? gstMaster.isActive
            });
        } else {
            await gstMaster.update({
                sgstRate: sgstRate ?? gstMaster.sgstRate,
                cgstRate: cgstRate ?? gstMaster.cgstRate,
                igstRate: igstRate ?? gstMaster.igstRate,
                isActive: isActive ?? gstMaster.isActive
            });
        }

        res.status(200).json({
            success: true,
            message: "GST Master updated successfully.",
            data: gstMaster
        });
    } catch (error) {
        console.error("Error updating GST Master:", error);
        next(error);
    }
};


exports.deleteGstMasterById = async (req, res, next) => {
    try {
        const gstMaster = await gstMasters.findByPk(req.params.id);
        if (!gstMaster) {
            return res.status(404).json({
                success: false,
                error: "GST Master not found."
            });
        }

        await gstMaster.update({ isActive: false });

        res.status(200).json({
            success: true,
            message: "GST Master deactivated successfully."
        });
    } catch (error) {
        console.error("Error deleting GST Master:", error);
        next(error);
    }
}