import React, { useState, useEffect } from "react";
import "../styles/CompanyForm.css";
import {
  addCompany,
  updateCompany,
  getGstMasters,
  fileUrl,
  safeApiCall,
} from "../services/api";
import { toast } from "../utils/toast";

const countryData = {
  USA: {
    states: {
      NY: ["New York", "Buffalo"],
      CA: ["Los Angeles", "San Francisco"],
    },
  },
  India: {
    states: {
      Gujarat: ["Ahmedabad", "Surat", "Rajkot"],
      Maharashtra: ["Mumbai", "Pune"],
    },
  },
};

const CompanyForm = ({ editCompany, onDataUpdate }) => {
  const [formData, setFormData] = useState({
    companyName: "",
    companyAddress: "",
    companyGstNumber: "",
    companyAccountNumber: "",
    accountHolderName: "",
    ifscCode: "",
    branchName: "",
    country: "",
    state: "",
    city: "",
    gstMasterId: 1, // default GST Master ID
    isActive: true,
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [gstRates, setGstRates] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const fetchGstRates = async () => {
      const [response, error] = await safeApiCall(getGstMasters);
      if (error) {
        toast.error("Failed to fetch GST rates");
      } else {
        setGstRates(response?.data || []);
      }
    };
    fetchGstRates();
  }, []);

  useEffect(() => {
    if (editCompany) {
      setFormData({
        companyName: editCompany.companyName || "",
        companyAddress: editCompany.companyAddress || "",
        companyGstNumber: editCompany.companyGstNumber || "",
        companyAccountNumber: editCompany.companyAccountNumber || "",
        accountHolderName: editCompany.accountHolderName || "",
        ifscCode: editCompany.ifscCode || "",
        branchName: editCompany.branchName || "",
        country: editCompany.country || "",
        state: editCompany.state || "",
        city: editCompany.city || "",
        gstMasterId: editCompany.gstMasterId || 1,
        isActive: editCompany.isActive ?? true,
      });

      const newStates = Object.keys(
        countryData[editCompany.country]?.states || {}
      );
      const newCities =
        countryData[editCompany.country]?.states[editCompany.state] || [];
      setStates(newStates);
      setCities(newCities);

      // Set logo preview if exists
      if (editCompany.companyLogo) {
        setLogoPreview(fileUrl(editCompany.companyLogo));
      } else {
        setLogoPreview(null);
      }
      setLogoFile(null);
    } else {
      setLogoPreview(null);
      setLogoFile(null);
    }
    setErrors({});
  }, [editCompany]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));

    if (name === "country") {
      const newStates = Object.keys(countryData[value]?.states || {});
      setStates(newStates);
      setCities([]);
      setFormData((prev) => ({ ...prev, state: "", city: "" }));
    }

    if (name === "state") {
      const newCities = countryData[formData.country]?.states[value] || [];
      setCities(newCities);
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only image files (JPEG, PNG, GIF, WEBP) are allowed");
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Customer Users cannot create a new company (only edit their own)
    if (!editCompany && currentUser?.userType === "Customer User") {
      toast.error("Only admin can add a company");
      return;
    }

    const newErrors = {};

    // Company Name validation
    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    } else if (formData.companyName.trim().length < 3) {
      newErrors.companyName = "Company name must be at least 3 characters";
    }

    // Company Address validation
    if (!formData.companyAddress.trim()) {
      newErrors.companyAddress = "Company address is required";
    }

    // GST Number validation (15 characters alphanumeric)
    if (formData.companyGstNumber.trim()) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.companyGstNumber.trim())) {
        newErrors.companyGstNumber =
          "Invalid GST number format (e.g., 22AAAAA0000A1Z5)";
      }
    }

    // Account Number validation (numeric, 9-18 digits)
    if (!formData.companyAccountNumber.trim()) {
      newErrors.companyAccountNumber = "Account number is required";
    } else if (!/^\d{9,18}$/.test(formData.companyAccountNumber.trim())) {
      newErrors.companyAccountNumber = "Account number must be 9-18 digits";
    }

    // Account Holder Name validation
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = "Account holder name is required";
    }

    // IFSC Code validation (11 characters: 4 letters + 7 digits/letters)
    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = "IFSC code is required";
    } else if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())
    ) {
      newErrors.ifscCode = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    // Branch Name validation
    if (!formData.branchName.trim()) {
      newErrors.branchName = "Branch name is required";
    }

    // Location validation
    if (!formData.country) {
      newErrors.country = "Country is required";
    }
    if (!formData.state) {
      newErrors.state = "State is required";
    }
    if (!formData.city) {
      newErrors.city = "City is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return;
    }

    setLoading(true);

    // Create FormData for file upload
    const formDataToSend = new FormData();
    formDataToSend.append("companyName", formData.companyName.trim());
    formDataToSend.append("companyAddress", formData.companyAddress.trim());
    formDataToSend.append("companyGstNumber", formData.companyGstNumber.trim());
    formDataToSend.append(
      "companyAccountNumber",
      formData.companyAccountNumber.trim()
    );
    formDataToSend.append(
      "accountHolderName",
      formData.accountHolderName.trim()
    );
    formDataToSend.append("ifscCode", formData.ifscCode.trim().toUpperCase());
    formDataToSend.append("branchName", formData.branchName.trim());
    formDataToSend.append("country", formData.country);
    formDataToSend.append("state", formData.state);
    formDataToSend.append("city", formData.city);
    formDataToSend.append("gstMasterId", formData.gstMasterId);
    formDataToSend.append("isActive", formData.isActive);

    if (logoFile) {
      formDataToSend.append("companyLogo", logoFile);
    }

    if (editCompany) {
      const [data, error] = await safeApiCall(
        updateCompany,
        editCompany.id,
        formDataToSend
      );
      if (error) {
        toast.error(error);
      } else {
        toast.success("Company profile updated successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    } else {
      const [data, error] = await safeApiCall(addCompany, formDataToSend);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Company profile added successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    }

    setLoading(false);
  };

  return (
    <div className="company-form-container">
      <h3>{editCompany ? "Edit Company" : "Add Company"}</h3>
      <form className="company-form" onSubmit={handleSubmit}>
        <fieldset className="form-section">
          <legend>Company Details</legend>
          <label>
            Company Logo
            <div style={{ marginTop: "10px" }}>
              {logoPreview ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <img
                    src={logoPreview}
                    alt="Company Logo Preview"
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "contain",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{ padding: "5px 10px", cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              )}
            </div>
          </label>
          <label>
            Name
            <input
              type="text"
              name="companyName"
              className={errors.companyName ? "input-error" : ""}
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Enter company name"
            />
            {errors.companyName && (
              <small className="error-message">{errors.companyName}</small>
            )}
          </label>
          <label>
            Address
            <input
              type="text"
              name="companyAddress"
              className={errors.companyAddress ? "input-error" : ""}
              value={formData.companyAddress}
              onChange={handleChange}
              placeholder="Enter company address"
            />
            {errors.companyAddress && (
              <small className="error-message">{errors.companyAddress}</small>
            )}
          </label>
          <label>
            GST Number
            <input
              type="text"
              name="companyGstNumber"
              className={errors.companyGstNumber ? "input-error" : ""}
              value={formData.companyGstNumber}
              onChange={handleChange}
              placeholder="22AAAAA0000A1Z5"
              maxLength="15"
            />
            {errors.companyGstNumber && (
              <small className="error-message">{errors.companyGstNumber}</small>
            )}
          </label>
          <label>
            GST Rate
            <select
              name="gstMasterId"
              value={formData.gstMasterId}
              onChange={handleChange}
              required
            >
              {gstRates.map((gst) => (
                <option key={gst.id} value={gst.id}>
                  {gst.gstRate}%
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="form-section">
          <legend>Account Details</legend>
          <label>
            Account Number
            <input
              type="text"
              name="companyAccountNumber"
              className={errors.companyAccountNumber ? "input-error" : ""}
              value={formData.companyAccountNumber}
              onChange={handleChange}
              placeholder="9-18 digits"
            />
            {errors.companyAccountNumber && (
              <small className="error-message">
                {errors.companyAccountNumber}
              </small>
            )}
          </label>
          <label>
            Holder Name
            <input
              type="text"
              name="accountHolderName"
              className={errors.accountHolderName ? "input-error" : ""}
              value={formData.accountHolderName}
              onChange={handleChange}
              placeholder="Enter account holder name"
            />
            {errors.accountHolderName && (
              <small className="error-message">
                {errors.accountHolderName}
              </small>
            )}
          </label>
          <label>
            IFSC Code
            <input
              type="text"
              name="ifscCode"
              className={errors.ifscCode ? "input-error" : ""}
              value={formData.ifscCode}
              onChange={handleChange}
              placeholder="SBIN0001234"
              maxLength="11"
            />
            {errors.ifscCode && (
              <small className="error-message">{errors.ifscCode}</small>
            )}
          </label>
          <label>
            Branch Name
            <input
              type="text"
              name="branchName"
              className={errors.branchName ? "input-error" : ""}
              value={formData.branchName}
              onChange={handleChange}
              placeholder="Enter branch name"
            />
            {errors.branchName && (
              <small className="error-message">{errors.branchName}</small>
            )}
          </label>
          <label>
            Country
            <select
              name="country"
              className={errors.country ? "input-error" : ""}
              value={formData.country}
              onChange={handleChange}
            >
              <option value="">Select Country</option>
              {Object.keys(countryData).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.country && (
              <small className="error-message">{errors.country}</small>
            )}
          </label>
          <label>
            State
            <select
              name="state"
              className={errors.state ? "input-error" : ""}
              value={formData.state}
              onChange={handleChange}
              disabled={!states.length}
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <small className="error-message">{errors.state}</small>
            )}
          </label>
          <label>
            City
            <select
              name="city"
              className={errors.city ? "input-error" : ""}
              value={formData.city}
              onChange={handleChange}
              disabled={!cities.length}
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.city && (
              <small className="error-message">{errors.city}</small>
            )}
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
        </fieldset>

        <div className="form-buttons">
          <button type="submit" className="form-button" disabled={loading}>
            {loading
              ? editCompany
                ? "Updating..."
                : "Adding..."
              : editCompany
              ? "Update"
              : "Add"}
          </button>
          <button
            type="button"
            className="form-button cancel-btn"
            onClick={onDataUpdate}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyForm;
