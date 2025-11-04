const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { sequelize } = require("./models");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const gstMasterRoutes = require("./routes/gstMasterRoutes");
const companyProfileRoutes = require("./routes/companyProfileRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const app = express();
const userRoutes = require('./routes/userRoutes');

dotenv.config();
const PORT = process.env.PORT || 3000;

const corsOptions = {
    origin: process.env.CLIENT_URL ||  "http://localhost:5173",
    credentials: true,
};

app.use(compression());
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan("combined"));
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/gstMasters", gstMasterRoutes);
app.use("/api/companyProfiles", companyProfileRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use('/api/users', userRoutes);
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);


app.use((err, req, res, next) => {
    console.error("Error:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected successfully");
        app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
})();
