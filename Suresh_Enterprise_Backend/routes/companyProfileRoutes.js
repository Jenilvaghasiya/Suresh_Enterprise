const express = require("express");
const router = express.Router();
const companyProfileController = require("../controllers/companyProfileController");
const upload = require("../middleware/upload");

router.post("/", upload.single("companyLogo"), companyProfileController.createCompanyProfile);
router.get("/", companyProfileController.getAllCompanyProfile);
router.get("/:id", companyProfileController.getCompanyProfileById);
router.patch("/:id", upload.single("companyLogo"), companyProfileController.updateCompanyProfileById);
router.delete("/:id", companyProfileController.deleteCompanyProfileById);

module.exports = router;