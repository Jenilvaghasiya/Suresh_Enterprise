const User = require("../models/user");
const CompanyProfile = require("../models/companyProfile");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-for-admins";
// Helper function to validate email
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide email and password." });
    }

    // 2. Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Use a generic error message for security
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials." });
    }

    // 3. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials." });
    }

    // 4. IMPORTANT: Check if the user is an 'Admin User'
    if (user.userType !== "Admin User") {
      return res
        .status(403)
        .json({ success: false, error: "Access denied. Not an admin user." });
    }

    // 5. If all checks pass, create the JWT payload
    const payload = {
      id: user.id,
      name: user.name,
      userType: user.userType,
    };

    // 6. Sign the token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

    // 7. Set JWT in httpOnly cookie for security
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // 8. Send the successful response
    res.status(200).json({
      success: true,
      message: "Admin login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        company_id: user.company_id,
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    next(error);
  }
};

// User login (for Customer Users)
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide email and password." });
    }

    // 2. Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials." });
    }

    // 3. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials." });
    }

    // 4. Create the JWT payload
    const payload = {
      id: user.id,
      name: user.name,
      userType: user.userType,
    };

    // 5. Sign the token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

    // 6. Set JWT in httpOnly cookie for security
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // 7. Send the successful response
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        company_id: user.company_id,
      },
    });
  } catch (error) {
    console.error("User Login Error:", error);
    next(error);
  }
};

// Logout user
exports.logoutUser = async (req, res, next) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    next(error);
  }
};

// (Removed getCurrentUser endpoint)

// Create a new user
exports.createUser = async (req, res, next) => {
  try {
    const {
      name,
      address,
      mobile,
      country,
      city,
      state,
      email,
      password,
      userType,
      company_id,
      createdBy,
      withGst,
      withoutGst,
    } = req.body;

    // --- Basic Validation ---
    if (!name || !mobile || !email || !password) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Name, mobile, email, and password are required.",
        });
    }
    if (!company_id) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Company ID is required.",
        });
    }
    const companyRecord = await CompanyProfile.findByPk(company_id);
    if (!companyRecord) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Company not found.",
        });
    }
    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Please provide a valid email address.",
        });
    }

    // --- Check for Duplicates ---
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email: email }, { mobile: mobile }] },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({
          success: false,
          error: "A user with this email or mobile number already exists.",
        });
    }

    // --- GST selection validation (optional but recommended) ---
    if (withGst !== true && withoutGst !== true) {
      return res
        .status(400)
        .json({ success: false, error: "Please select either With GST or Without GST." });
    }

    // --- Create User ---
    const user = await User.create({
      name,
      address,
      mobile,
      country,
      city,
      state,
      email,
      password,
      userType,
      company_id,
      withGst: !!withGst,
      withoutGst: !!withoutGst,
      createdBy: createdBy || null, // In a real app, this would be req.user.id
    });

    // Exclude password from the response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res
      .status(201)
      .json({
        success: true,
        message: "User created successfully",
        data: userResponse,
      });
  } catch (error) {
    console.error("Error creating user: ", error);
    next(error);
  }
};

// Get all users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] }, // Exclude password from the result
    });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users: ", error);
    next(error);
  }
};

// Get a single user by ID
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user by id: ", error);
    next(error);
  }
};

// Update a user by ID
exports.updateUserById = async (req, res, next) => {
  try {
    const {
      name,
      address,
      mobile,
      country,
      city,
      state,
      email,
      password,
      userType,
      company_id,
      updatedBy,
      withGst,
      withoutGst,
    } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // --- Check for Duplicate Email/Mobile ---
    if (email || mobile) {
      const criteria = [];
      if (email) criteria.push({ email });
      if (mobile) criteria.push({ mobile });

      const duplicate = await User.findOne({
        where: {
          [Op.or]: criteria,
          id: { [Op.ne]: req.params.id }, // Exclude the current user from the check
        },
      });
      if (duplicate) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Another user with this email or mobile already exists.",
          });
      }
    }

    // --- Validate Company ID ---
    if (company_id !== undefined) {
      const companyRecord = await CompanyProfile.findByPk(company_id);
      if (!companyRecord) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Company not found.",
          });
      }
    }

    // --- GST selection validation if provided ---
    if (withGst === true || withoutGst === true) {
      // ensure at least one is true; frontend ensures mutual exclusivity
    } else if (withGst === false && withoutGst === false) {
      return res
        .status(400)
        .json({ success: false, error: "Please select either With GST or Without GST." });
    }

    // --- Update Fields ---
    user.name = name ?? user.name;
    user.address = address ?? user.address;
    user.mobile = mobile ?? user.mobile;
    user.country = country ?? user.country;
    user.city = city ?? user.city;
    user.state = state ?? user.state;
    user.email = email ?? user.email;
    user.userType = userType ?? user.userType;
    user.company_id = company_id ?? user.company_id;
    user.updatedBy = updatedBy || null; // In a real app, this would be req.user.id
    if (withGst !== undefined) user.withGst = !!withGst;
    if (withoutGst !== undefined) user.withoutGst = !!withoutGst;
    if (password) {
      user.password = password; // The 'beforeUpdate' hook will hash it
    }

    await user.save();

    const userResponse = user.toJSON();
    delete userResponse.password;

    res
      .status(200)
      .json({
        success: true,
        message: "User updated successfully",
        data: userResponse,
      });
  } catch (error) {
    console.error("Error updating user: ", error);
    next(error);
  }
};

// Delete a user by ID
exports.deleteUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    await user.destroy();
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user: ", error);
    next(error);
  }
};