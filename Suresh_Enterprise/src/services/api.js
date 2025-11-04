import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true 
});

export const fileUrl = (path) => (path ? `${API_ORIGIN}${path}` : "");

export const safeApiCall = async (fn, ...args) => {
  try {
    const res = await fn(...args);
    return [res.data, null];
  } catch (err) {
    console.error("API Error:", err);
    const errorMessage = err.response?.data?.error || err.message || "Something went wrong!";
    return [null, errorMessage];
  }
};

export const addCategory = (data) => API.post("/categories", data);
export const getCategories = () => API.get("/categories");
export const updateCategory = (id, data) => API.patch(`/categories/${id}`, data);
export const deleteCategory = (id) => API.delete(`/categories/${id}`);
export const deleteAllCategory = () => API.delete(`/categories`);

export const addProduct = (data) => API.post("/products", data);
export const getProducts = () => API.get("/products");
export const updateProduct = (id, data) => API.patch(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);

export const addCustomer = (data) => API.post("/customers", data);
export const getCustomers = () => API.get("/customers");
export const updateCustomer = (id, data) => API.patch(`/customers/${id}`, data);
export const deleteCustomer = (id) => API.delete(`/customers/${id}`);
export const deleteAllCustomers = () => API.delete("/customers");

export const addCompany = (data) => API.post("/companyProfiles", data);
export const getCompanies = () => API.get("/companyProfiles");
export const getCompanyById = (id) => API.get(`/companyProfiles/${id}`);
export const updateCompany = (id, data) => API.patch(`/companyProfiles/${id}`, data);
export const deleteCompany = (id) => API.delete(`/companyProfiles/${id}`);
export const deleteAllCompanies = () => API.delete("/companyProfiles");

export const addInvoice = (data) => API.post("/invoices", data);
export const getInvoices = () => API.get("/invoices");
export const getInvoicesByCompanyId = (companyId) => API.get(`/invoices/company/${companyId}`);
export const getInvoicesByUserId = (userId) => API.get(`/invoices/user/${userId}`);
export const getInvoiceById = (id) => API.get(`/invoices/${id}`);
export const updateInvoice = (id, data) => API.patch(`/invoices/${id}`, data);
export const deleteInvoice = (id) => API.delete(`/invoices/${id}`);

export const addGstMaster = (data) => API.post("/gstMasters", data);
export const getGstMasters = () => API.get("/gstMasters");
export const getGstMasterById = (id) => API.get(`/gstMasters/${id}`);
export const updateGstMaster = (id, data) => API.patch(`/gstMasters/${id}`, data);
export const deleteGstMaster = (id) => API.delete(`/gstMasters/${id}`);

export const loginUser = (data) => API.post("/users/login", data);
export const loginAdmin = (data) => API.post("/users/admin-login", data);
export const logoutUser = () => API.post("/users/logout");

export const addUser = (data) => API.post("/users", data);
export const getUsers = () => API.get("/users");
export const updateUser = (id, data) => API.patch(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);

// Payments
export const addPayment = (data) => API.post("/payments", data);
export const getPaymentsByCustomer = (customerId) => API.get(`/payments/customer/${customerId}`);
export const getCustomerBalance = (customerId) => API.get(`/payments/balance/${customerId}`);
export const createRazorpayOrder = (data) => API.post("/payments/razorpay/order", data);