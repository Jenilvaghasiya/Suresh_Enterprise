const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/admin-login", userController.loginAdmin);
router.post("/login", userController.loginUser);
router.post("/logout", userController.logoutUser);

router.post("/", userController.createUser);
router.get("/", userController.getAllUsers);  
router.get("/:id", userController.getUserById);  
router.patch("/:id", userController.updateUserById); 
router.delete("/:id", userController.deleteUserById);  

module.exports = router;
