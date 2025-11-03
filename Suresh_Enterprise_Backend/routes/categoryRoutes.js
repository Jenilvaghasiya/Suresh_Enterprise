const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

router.post("/", categoryController.createCategory);
router.get("/", categoryController.getAllCategory);
router.get("/:id", categoryController.getCategoryById);
router.patch("/:id", categoryController.updateCategoryById);
router.delete("/:id", categoryController.deleteCategoryById);

module.exports = router