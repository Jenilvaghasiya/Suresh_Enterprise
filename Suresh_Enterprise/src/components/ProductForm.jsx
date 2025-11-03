import React, { useState, useEffect } from "react";
import "../styles/ProductForm.css";
import {
  addProduct,
  updateProduct,
  getCategories,
  getCompanies,
  safeApiCall,
} from "../services/api";
import { toast } from "../utils/toast";

const ProductForm = ({ editProduct, onDataUpdate }) => {
  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    hsnCode: "",
    uom: "",
    price: "",
    category_id: "",
    company_id: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const isCustomer = currentUser?.userType === "Customer User";

  useEffect(() => {
    const fetchCategories = async () => {
      const [response, error] = await safeApiCall(getCategories);
      if (error) {
        toast.error("Failed to fetch categories");
      } else {
        const all = response?.data || [];
        const scoped = (currentUser?.userType === "Customer User")
          ? all.filter((cat) => cat.isActive && cat.company_id === currentUser?.company_id)
          : all.filter((cat) => cat.isActive);
        setCategories(scoped);
      }
    };
    const fetchCompanies = async () => {
      const [res, err] = await safeApiCall(getCompanies);
      if (err) {
        // optional toast
      } else {
        const list = res?.data || [];
        const scoped = (currentUser?.userType === "Customer User")
          ? list.filter((c) => c.id === currentUser?.company_id)
          : list;
        setCompanies(scoped);
        // Preselect company for customer when not editing
        if (!editProduct && (currentUser?.userType === "Customer User") && currentUser?.company_id) {
          setFormData((prev) => ({ ...prev, company_id: String(currentUser.company_id) }));
        }
      }
    };
    fetchCategories();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (editProduct) {
      setFormData({
        productName: editProduct.productName,
        description: editProduct.description,
        hsnCode: editProduct.hsnCode || "",
        uom: editProduct.uom || "",
        price: editProduct.price,
        category_id: editProduct.category_id || "",
        company_id: (currentUser?.userType === "Customer User")
          ? String(currentUser?.company_id || "")
          : editProduct.company_id || "",
        isActive: editProduct.isActive,
      });
    }
    setErrors({});
  }, [editProduct]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = "Product name is required";
    } else if (formData.productName.trim().length < 3) {
      newErrors.productName = "Product name must be at least 3 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.hsnCode.trim()) {
      newErrors.hsnCode = "HSN Code is required";
    } else if (!/^\d{4,8}$/.test(formData.hsnCode.trim())) {
      newErrors.hsnCode = "HSN Code must be 4-8 digits";
    }

    if (!formData.uom.trim()) {
      newErrors.uom = "UOM is required";
    }

    if (formData.price === "" || Number(formData.price) <= 0) {
      newErrors.price = "Price must be a positive number";
    }

    if (!isCustomer && !formData.company_id) {
      newErrors.company_id = "Company is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return;
    }

    setLoading(true);

    const payload = {
      productName: formData.productName.trim(),
      description: formData.description.trim(),
      hsnCode: formData.hsnCode.trim(),
      uom: formData.uom.trim(),
      price: Number(formData.price),
      category_id: formData.category_id || null,
      company_id: parseInt((currentUser?.userType === "Customer User") && currentUser?.company_id ? currentUser.company_id : formData.company_id),
      isActive: formData.isActive,
    };

    if (editProduct) {
      const [data, error] = await safeApiCall(
        updateProduct,
        editProduct.id,
        payload
      );
      if (error) {
        toast.error(error);
      } else {
        toast.success("Product updated successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    } else {
      const [data, error] = await safeApiCall(addProduct, payload);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Product added successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    }

    setLoading(false);
  };

  return (
    <div className="product-form-container">
      <h3>{editProduct ? "Edit Product" : "Add Product"}</h3>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Product Name
          <input
            type="text"
            name="productName"
            className={errors.productName ? "input-error" : ""}
            value={formData.productName}
            onChange={handleChange}
            placeholder="Enter product name"
          />
          {errors.productName && (
            <small className="error-message">{errors.productName}</small>
          )}
        </label>

        <label>
          Description
          <input
            type="text"
            name="description"
            className={errors.description ? "input-error" : ""}
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter product description"
          />
          {errors.description && (
            <small className="error-message">{errors.description}</small>
          )}
        </label>

        <label>
          HSN Code
          <input
            type="text"
            name="hsnCode"
            className={errors.hsnCode ? "input-error" : ""}
            value={formData.hsnCode}
            onChange={handleChange}
            placeholder="Enter HSN code (4-8 digits)"
          />
          {errors.hsnCode && (
            <small className="error-message">{errors.hsnCode}</small>
          )}
        </label>

        <label>
          UOM
          <input
            type="text"
            name="uom"
            className={errors.uom ? "input-error" : ""}
            value={formData.uom}
            onChange={handleChange}
            placeholder="Enter Unit of Measurement"
          />
          {errors.uom && <small className="error-message">{errors.uom}</small>}
        </label>

        <label>
          Price
          <input
            type="number"
            name="price"
            className={errors.price ? "input-error" : ""}
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter product price"
            step="0.01"
          />
          {errors.price && (
            <small className="error-message">{errors.price}</small>
          )}
        </label>

        <label>
          Category
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        {!isCustomer && (
          <label>
            Company
            <select
              name="company_id"
              className={errors.company_id ? "input-error" : ""}
              value={formData.company_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Company --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>
            {errors.company_id && (
              <small className="error-message">{errors.company_id}</small>
            )}
          </label>
        )}

        <label className="checkbox-label">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
          />
          Active
        </label>

        <button type="submit" className="form-button" disabled={loading}>
          {loading
            ? editProduct
              ? "Updating..."
              : "Adding..."
            : editProduct
            ? "Update Product"
            : "Add Product"}
        </button>
      </form>
    </div>
  );
};

export default ProductForm;
