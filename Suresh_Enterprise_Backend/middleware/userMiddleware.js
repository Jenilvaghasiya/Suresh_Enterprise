// middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Your Sequelize User model

// In a real application, store your secret in an environment variable (.env)
const keysecret = process.env.JWT_SECRET || "your-super-secret-key-that-is-long";

const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for the token in cookies first (for browser requests)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check for the token in the Authorization header (for API requests)
    else if (
      req.header("Authorization") &&
      req.header("Authorization").startsWith("Bearer")
    ) {
      token = req.header("Authorization").replace("Bearer ", "");
    }

    if (!token) {
      // This error will be caught by the catch block
      throw new Error("No token provided, authorization denied");
    }

    // Verify the token
    const decoded = jwt.verify(token, keysecret);

    // Find the user by the ID from the token's payload
    const user = await User.findByPk(decoded.id, {
      // Exclude the password from the user object
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Attach the token and user to the request object
    req.token = token;
    req.user = user; // Attaching the full user object (without password)

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Authentication Error:", error.message);
    res
      .status(401)
      .json({ success: false, error: "Unauthorized: Please log in." });
  }
};

module.exports = authenticate;
