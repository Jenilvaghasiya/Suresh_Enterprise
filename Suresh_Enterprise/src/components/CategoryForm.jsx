import React, { useEffect, useState } from "react";
import { addCategory, updateCategory, getCompanies, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import "../styles/CategoryForm.css";

const CategoryForm = ({ editCategory, onDataUpdate }) => {
  const [categoryName, setCategoryName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
        if (!editCategory) {
          // Preselect user's company for customer users
          if ((currentUser?.userType === "Customer User") && currentUser?.company_id) {
            setCompanyId(String(currentUser.company_id));
          }
        }
      }
    };
    fetchCompanies();

    if (editCategory) {
      setCategoryName(editCategory.name);
      setIsActive(editCategory.isActive);
      setCompanyId(editCategory.company_id || "");
    } else {
      setCategoryName("");
      setIsActive(true);
      setCompanyId((currentUser?.userType === "Customer User") && currentUser?.company_id ? String(currentUser.company_id) : "");
    }
    setErrors({});
  }, [editCategory]);

  const validateForm = () => {
    const newErrors = {};
    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      newErrors.categoryName = "Category name is required";
    } else if (trimmedName.length < 3) {
      newErrors.categoryName = "Category name must be at least 3 characters";
    } else if (trimmedName.length > 30) {
      newErrors.categoryName = "Category name must not exceed 30 characters";
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      newErrors.categoryName =
        "Category name must contain only letters and spaces";
    }

    if (!isCustomer && !companyId) {
      newErrors.companyId = "Company is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate and get errors immediately
    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      toast.error("Category name is required");
      return;
    } else if (trimmedName.length < 3) {
      toast.error("Category name must be at least 3 characters");
      return;
    } else if (trimmedName.length > 30) {
      toast.error("Category name must not exceed 30 characters");
      return;
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      toast.error("Category name must contain only letters and spaces");
      return;
    }

    if (!isCustomer && !companyId) {
      toast.error("Company is required");
      return;
    }

    setLoading(true);

    if (editCategory) {
      const [data, error] = await safeApiCall(updateCategory, editCategory.id, {
        name: trimmedName,
        isActive,
        company_id: companyId ? parseInt(companyId) : undefined,
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success("Category updated successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    } else {
      const [data, error] = await safeApiCall(addCategory, {
        name: trimmedName,
        isActive,
        company_id: companyId ? parseInt(companyId) : undefined,
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success("Category added successfully!");
        if (onDataUpdate) onDataUpdate();
      }
    }

    setLoading(false);
  };

  return (
    <div className="category-form-container">
      <h3>{editCategory ? "Edit Category" : "Add Category"}</h3>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="form-label">
          Category Name
          <input
            type="text"
            className={`form-input ${errors.categoryName ? "input-error" : ""}`}
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Enter category name (3-30 letters)"
          />
          {errors.categoryName && (
            <span className="error-message">{errors.categoryName}</span>
          )}
        </label>

        {!isCustomer && (
          <label className="form-label">
            Company
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
            >
              <option value="">-- Select Company --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>
            {errors.companyId && <span className="error-message">{errors.companyId}</span>}
          </label>
        )}

        <label className="form-label">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Active
        </label>

        <button type="submit" className="form-button" disabled={loading}>
          {loading
            ? editCategory
              ? "Updating..."
              : "Adding..."
            : editCategory
            ? "Update Category"
            : "Add Category"}
        </button>
      </form>
    </div>
  );
};

export default CategoryForm;
