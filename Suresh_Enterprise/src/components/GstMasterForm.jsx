import React, { useState, useEffect } from "react";
import { addGstMaster, updateGstMaster, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import "../styles/GstMasterForm.css";

const GstMasterForm = ({ editGst, onDataUpdate }) => {
  const [formData, setFormData] = useState({
    gstRate: "",
    sgstRate: "",
    cgstRate: "",
    igstRate: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editGst) {
      setFormData({
        gstRate: editGst.gstRate || "",
        sgstRate: editGst.sgstRate || "",
        cgstRate: editGst.cgstRate || "",
        igstRate: editGst.igstRate || "",
        isActive: editGst.isActive ?? true,
      });
    }
    setErrors({});
  }, [editGst]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate GST Rate
    if (!formData.gstRate || formData.gstRate === "") {
      newErrors.gstRate = "GST Rate is required";
    } else if (Number(formData.gstRate) < 0 || Number(formData.gstRate) > 100) {
      newErrors.gstRate = "GST Rate must be between 0 and 100";
    }

    // Validate SGST Rate
    if (!formData.sgstRate || formData.sgstRate === "") {
      newErrors.sgstRate = "SGST Rate is required";
    } else if (
      Number(formData.sgstRate) < 0 ||
      Number(formData.sgstRate) > 100
    ) {
      newErrors.sgstRate = "SGST Rate must be between 0 and 100";
    }

    // Validate CGST Rate
    if (!formData.cgstRate || formData.cgstRate === "") {
      newErrors.cgstRate = "CGST Rate is required";
    } else if (
      Number(formData.cgstRate) < 0 ||
      Number(formData.cgstRate) > 100
    ) {
      newErrors.cgstRate = "CGST Rate must be between 0 and 100";
    }

    // Validate IGST Rate
    if (!formData.igstRate || formData.igstRate === "") {
      newErrors.igstRate = "IGST Rate is required";
    } else if (
      Number(formData.igstRate) < 0 ||
      Number(formData.igstRate) > 100
    ) {
      newErrors.igstRate = "IGST Rate must be between 0 and 100";
    }

    // Validate SGST + CGST = GST
    const gst = Number(formData.gstRate);
    const sgst = Number(formData.sgstRate);
    const cgst = Number(formData.cgstRate);
    const igst = Number(formData.igstRate);

    if (sgst + cgst !== gst) {
      newErrors.gstRate = "SGST + CGST must equal GST Rate";
    }

    if (igst !== gst) {
      newErrors.igstRate = "IGST Rate must equal GST Rate";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return;
    }

    setLoading(true);

    const payload = {
      gstRate: Number(formData.gstRate),
      sgstRate: Number(formData.sgstRate),
      cgstRate: Number(formData.cgstRate),
      igstRate: Number(formData.igstRate),
      isActive: formData.isActive,
    };

    if (editGst) {
      const [data, error] = await safeApiCall(
        updateGstMaster,
        editGst.id,
        payload
      );
      if (error) {
        toast.error(error);
      } else {
        toast.success("GST Rate updated successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    } else {
      const [data, error] = await safeApiCall(addGstMaster, payload);
      if (error) {
        toast.error(error);
      } else {
        toast.success("GST Rate added successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    }

    setLoading(false);
  };

  return (
    <form className="gst-master-form-container" onSubmit={handleSubmit}>
      <h3>{editGst ? "Edit GST Rate" : "Add GST Rate"}</h3>

      <div className="form-grid">
        <label>
          GST Rate (%)
          <input
            type="number"
            name="gstRate"
            className={errors.gstRate ? "input-error" : ""}
            value={formData.gstRate}
            onChange={handleChange}
            placeholder="e.g., 18"
            step="0.01"
            min="0"
            max="100"
          />
          {errors.gstRate && (
            <small className="error-message">{errors.gstRate}</small>
          )}
        </label>

        <label>
          SGST Rate (%)
          <input
            type="number"
            name="sgstRate"
            className={errors.sgstRate ? "input-error" : ""}
            value={formData.sgstRate}
            onChange={handleChange}
            placeholder="e.g., 9"
            step="0.01"
            min="0"
            max="100"
          />
          {errors.sgstRate && (
            <small className="error-message">{errors.sgstRate}</small>
          )}
        </label>

        <label>
          CGST Rate (%)
          <input
            type="number"
            name="cgstRate"
            className={errors.cgstRate ? "input-error" : ""}
            value={formData.cgstRate}
            onChange={handleChange}
            placeholder="e.g., 9"
            step="0.01"
            min="0"
            max="100"
          />
          {errors.cgstRate && (
            <small className="error-message">{errors.cgstRate}</small>
          )}
        </label>

        <label>
          IGST Rate (%)
          <input
            type="number"
            name="igstRate"
            className={errors.igstRate ? "input-error" : ""}
            value={formData.igstRate}
            onChange={handleChange}
            placeholder="e.g., 18"
            step="0.01"
            min="0"
            max="100"
          />
          {errors.igstRate && (
            <small className="error-message">{errors.igstRate}</small>
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
      </div>

      <button className="form-button" type="submit" disabled={loading}>
        {loading
          ? editGst
            ? "Updating..."
            : "Saving..."
          : editGst
          ? "Update GST"
          : "Save GST"}
      </button>
    </form>
  );
};

export default GstMasterForm;
