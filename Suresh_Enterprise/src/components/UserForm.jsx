import React, { useEffect, useState } from "react";
import {
  addUser,
  updateUser,
  getCompanies,
  safeApiCall,
} from "../services/api";
import { toast } from "../utils/toast";
import "../styles/UserForm.css";

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

const UserForm = ({ editUser, onDataUpdate }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    country: "",
    userType: "Customer User",
    company_id: "",
    withGst: true,
    withoutGst: false,
  });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const isEditing = !!editUser;
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const isCustomer = currentUser?.userType === "Customer User";
  const isEditingAdmin = !!editUser && editUser?.userType === "Admin User";
  const isCurrentAdmin = currentUser?.userType === "Admin User";

  useEffect(() => {
    const fetchCompanies = async () => {
      const [res, err] = await safeApiCall(getCompanies);
      if (!err) {
        const list = res?.data || [];
        const scoped = (currentUser?.userType === "Customer User")
          ? list.filter((c) => c.id === currentUser?.company_id)
          : list;
        setCompanies(scoped);
        if (!isEditing && (currentUser?.userType === "Customer User") && currentUser?.company_id) {
          setFormData((prev) => ({ ...prev, company_id: String(currentUser.company_id) }));
        }
      }
    };
    fetchCompanies();

    if (isEditing) {
      setFormData({
        name: editUser.name || "",
        email: editUser.email || "",
        mobile: editUser.mobile || "",
        address: editUser.address || "",
        city: editUser.city || "",
        state: editUser.state || "",
        country: editUser.country || "",
        userType: editUser.userType || "Customer User",
        password: "",
        company_id: (currentUser?.userType === "Customer User") ? String(currentUser?.company_id || "") : (editUser.company_id || ""),
        withGst: !!editUser?.withGst,
        withoutGst: !!editUser?.withoutGst,
      });

      const newStates = Object.keys(
        countryData[editUser.country]?.states || {}
      );
      const newCities =
        countryData[editUser.country]?.states[editUser.state] || [];
      setStates(newStates);
      setCities(newCities);
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        mobile: "",
        address: "",
        city: "",
        state: "",
        country: "",
        userType: "Customer User",
        company_id: "",
        withGst: true,
        withoutGst: true,
      });
      setStates([]);
      setCities([]);
    }
  }, [editUser, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

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

  const handleGstChange = (e) => {
    const { name, checked } = e.target;
    if (name === "withGst") {
      setFormData((prev) => ({ ...prev, withGst: checked }));
    } else if (name === "withoutGst") {
      setFormData((prev) => ({ ...prev, withoutGst: checked }));
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.mobile) {
      toast.error("Name, Email, and Mobile are required.");
      return false;
    }
    if (!isCustomer && !formData.company_id) {
      toast.error("Company is required.");
      return false;
    }
    if (!formData.withGst && !formData.withoutGst) {
      toast.error("Please select either With GST or Without GST.");
      return false;
    }
    if (!isEditing && !formData.password) {
      toast.error("Password is required for new users.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    // In a real app, createdBy/updatedBy would come from auth context
    const payload = {
      ...formData,
      company_id: parseInt((currentUser?.userType === "Customer User") && currentUser?.company_id ? currentUser.company_id : formData.company_id),
      createdBy: 1,
      updatedBy: 1,
    };
    if (isEditing && !payload.password) {
      delete payload.password; // Don't send empty password on update
    }

    const apiCall = isEditing ? updateUser : addUser;
    const args = isEditing ? [editUser.id, payload] : [payload];

    const [data, error] = await safeApiCall(apiCall, ...args);

    if (error) {
      toast.error(error);
    } else {
      toast.success(`User ${isEditing ? "updated" : "added"} successfully!`);
      if (onDataUpdate) onDataUpdate();
    }
    setLoading(false);
  };

  return (
    <div className="user-form-container">
      <h3>{isEditing ? "Edit User" : "Add User"}</h3>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Name{" "}
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Email{" "}
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Mobile{" "}
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required
          />
        </label>
        {!isCustomer && (
          <label>
            Type of Users
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              disabled={!isCurrentAdmin && !isEditingAdmin}
            >
              {isCurrentAdmin ? (
                <>
                  <option value="Admin User">Admin User</option>
                  <option value="Customer User">Customer User</option>
                </>
              ) : isEditingAdmin ? (
                <option value="Admin User">Admin User</option>
              ) : (
                <option value="Customer User">Customer User</option>
              )}
            </select>
          </label>
        )}
        {!isCustomer && (
          <label>
            Company
            <select
              name="company_id"
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
          </label>
        )}
        <label>
          Password{" "}
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isEditing ? "Leave blank to keep current" : ""}
            required={!isEditing}
          />
        </label>
        <label>
          Address{" "}
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </label>
        <label>
          Country
          <select
            name="country"
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
        </label>
        <label>
          State
          <select
            name="state"
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
        </label>
        <label>
          City
          <select
            name="city"
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
        </label>

        <label>
          <input
            type="checkbox"
            name="withGst"
            checked={formData.withGst}
            onChange={handleGstChange}
          />
          {" "}With GST
        </label>
        <label>
          <input
            type="checkbox"
            name="withoutGst"
            checked={formData.withoutGst}
            onChange={handleGstChange}
          />
          {" "}Without GST
        </label>

        <div className="form-button-container">
          <button type="submit" className="form-button" disabled={loading}>
            {loading
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
              ? "Update User"
              : "Add User"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
