import React, { useState, useEffect } from "react";
import "../styles/CustomerForm.css";
import { addCustomer, updateCustomer, getCompanies, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";

const CustomerForm = ({ editCustomer, onDataUpdate }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    gstNumber: "",
    stateCode: "",
    contactNumber: "",
    emailAddress: "",
    billingAddress: "",
    shippingAddress: "",
    openingBalance: "",
    openingDate: "",
    company_id: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
    const fetchCompanies = async () => {
      const [res, err] = await safeApiCall(getCompanies);
      if (!err) {
        const list = res?.data || [];
        const scoped = (currentUser?.userType === "Customer User")
          ? list.filter((c) => c.id === currentUser?.company_id)
          : list;
        setCompanies(scoped);
        if (!editCustomer && (currentUser?.userType === "Customer User") && currentUser?.company_id) {
          setFormData((prev) => ({ ...prev, company_id: String(currentUser.company_id) }));
        }
      }
    };
    fetchCompanies();

    if (editCustomer) {
      setFormData((prev) => ({
        ...prev,
        ...editCustomer,
        company_id: (currentUser?.userType === "Customer User") ? String(currentUser?.company_id || "") : (editCustomer.company_id || ""),
        openingDate: editCustomer.openingDate?.slice(0, 10) || "",
      }));
    }
    setErrors({});
  }, [editCustomer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Auto-uppercase GST number
    if (name === "gstNumber") {
      setFormData({
        ...formData,
        gstNumber: value.toUpperCase(),
      });
    } else if (name === "stateCode") {
      // Allow manual state code entry, ensure it's numeric and max 2 digits
      const numericValue = value.replace(/\D/g, "").substring(0, 2);
      setFormData({
        ...formData,
        stateCode: numericValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Customer Name validation
    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    } else if (formData.customerName.trim().length < 3) {
      newErrors.customerName = "Customer name must be at least 3 characters";
    }

    // GST Number validation (15 characters alphanumeric)
    if (formData.gstNumber.trim()) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.gstNumber.trim())) {
        newErrors.gstNumber =
          "Invalid GST number format (e.g., 22AAAAA0000A1Z5)";
      }
    }

    // State Code validation (required)
    if (!formData.stateCode.trim()) {
      newErrors.stateCode =
        "State code is required (leave empty only for customers outside India)";
    } else if (!/^[0-9]{2}$/.test(formData.stateCode.trim())) {
      newErrors.stateCode = "State code must be 2 digits (e.g., 24)";
    } else {
      const stateCodeNum = parseInt(formData.stateCode);
      if (stateCodeNum < 1 || stateCodeNum > 37) {
        newErrors.stateCode = "State code must be between 01 and 37";
      }
    }

    // Contact Number validation (10 digits)
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^\d{10}$/.test(formData.contactNumber.trim())) {
      newErrors.contactNumber = "Contact number must be 10 digits";
    }

    // Email validation
    if (formData.emailAddress.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emailAddress.trim())) {
        newErrors.emailAddress = "Invalid email format";
      }
    }

    // Opening Balance validation
    if (formData.openingBalance && Number(formData.openingBalance) < 0) {
      newErrors.openingBalance = "Opening balance cannot be negative";
    }

    // Company validation
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
      ...formData,
      customerName: formData.customerName.trim(),
      gstNumber: formData.gstNumber.trim(),
      contactNumber: formData.contactNumber.trim(),
      emailAddress: formData.emailAddress.trim(),
      billingAddress: formData.billingAddress.trim(),
      shippingAddress: formData.shippingAddress.trim(),
      openingBalance: formData.openingBalance
        ? Number(formData.openingBalance)
        : 0,
      company_id: parseInt((currentUser?.userType === "Customer User") && currentUser?.company_id ? currentUser.company_id : formData.company_id),
    };

    if (editCustomer) {
      const [data, error] = await safeApiCall(
        updateCustomer,
        editCustomer.id,
        payload
      );
      if (error) {
        toast.error(error);
      } else {
        toast.success("Customer updated successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    } else {
      const [data, error] = await safeApiCall(addCustomer, payload);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Customer added successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    }

    setLoading(false);
  };

  return (
    <div className="customer-form-container">
      <h3>{editCustomer ? "Edit Customer" : "Add Customer"}</h3>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Customer Name
          <input
            type="text"
            name="customerName"
            className={errors.customerName ? "input-error" : ""}
            value={formData.customerName}
            onChange={handleChange}
            placeholder="Enter customer name"
          />
          {errors.customerName && (
            <small className="error-message">{errors.customerName}</small>
          )}
        </label>

        <label>
          GST Number
          <input
            type="text"
            name="gstNumber"
            className={errors.gstNumber ? "input-error" : ""}
            value={formData.gstNumber}
            onChange={handleChange}
            placeholder="22AAAAA0000A1Z5"
          />
          {errors.gstNumber && (
            <small className="error-message">{errors.gstNumber}</small>
          )}
        </label>

        <label>
          State Code
          <input
            type="text"
            name="stateCode"
            className={errors.stateCode ? "input-error" : ""}
            value={formData.stateCode}
            onChange={handleChange}
            placeholder="Enter state code (e.g., 24)"
            maxLength="2"
            title="Common State Codes: Gujarat-24, Maharashtra-27, Delhi-07, Karnataka-29, Tamil Nadu-33, Rajasthan-08, Uttar Pradesh-09"
            required
          />
          {errors.stateCode && (
            <small className="error-message">{errors.stateCode}</small>
          )}
          <small
            style={{
              color: "#6b7280",
              fontSize: "12px",
              display: "block",
              marginTop: "4px",
            }}
          >
            Required. Common codes: GJ-24, MH-27, DL-07, KA-29, TN-33. Leave
            empty for outside India.
          </small>
        </label>

        <label>
          Contact Number
          <input
            type="text"
            name="contactNumber"
            className={errors.contactNumber ? "input-error" : ""}
            value={formData.contactNumber}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            maxLength="10"
          />
          {errors.contactNumber && (
            <small className="error-message">{errors.contactNumber}</small>
          )}
        </label>

        <label>
          Email Address
          <input
            type="email"
            name="emailAddress"
            className={errors.emailAddress ? "input-error" : ""}
            value={formData.emailAddress}
            onChange={handleChange}
            placeholder="customer@example.com"
          />
          {errors.emailAddress && (
            <small className="error-message">{errors.emailAddress}</small>
          )}
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

        <label>
          Billing Address
          <input
            type="text"
            name="billingAddress"
            value={formData.billingAddress}
            onChange={handleChange}
            placeholder="Enter billing address"
          />
        </label>

        <label>
          Shipping Address
          <input
            type="text"
            name="shippingAddress"
            value={formData.shippingAddress}
            onChange={handleChange}
            placeholder="Enter shipping address"
          />
        </label>

        <label>
          Opening Balance
          <input
            type="number"
            name="openingBalance"
            className={errors.openingBalance ? "input-error" : ""}
            value={formData.openingBalance}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
          {errors.openingBalance && (
            <small className="error-message">{errors.openingBalance}</small>
          )}
        </label>

        <label>
          Opening Date
          <input
            type="date"
            name="openingDate"
            value={formData.openingDate || ""}
            onChange={handleChange}
          />
        </label>

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
            ? editCustomer
              ? "Updating..."
              : "Adding..."
            : editCustomer
            ? "Update Customer"
            : "Add Customer"}
        </button>
      </form>
    </div>
  );
};

export default CustomerForm;
