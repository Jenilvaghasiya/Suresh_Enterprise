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
  const [userTypeSearch, setUserTypeSearch] = useState("");
  const [userTypeOpen, setUserTypeOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [stateOpen, setStateOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

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

  useEffect(() => {
    // Sync user type search label
    setUserTypeSearch(formData.userType || "");
  }, [formData.userType, isCurrentAdmin, isEditingAdmin]);

  useEffect(() => {
    // Sync company search label
    const selected = companies.find((c) => String(c.id) === String(formData.company_id));
    const label = selected ? (selected.companyName || selected.name) : "";
    setCompanySearch(label);
  }, [formData.company_id, companies]);

  useEffect(() => {
    setCountrySearch(formData.country || "");
  }, [formData.country]);

  useEffect(() => {
    setStateSearch(formData.state || "");
  }, [formData.state, states]);

  useEffect(() => {
    setCitySearch(formData.city || "");
  }, [formData.city, cities]);

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
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={userTypeSearch}
                onChange={(e) => {
                  setUserTypeSearch(e.target.value);
                  setUserTypeOpen(true);
                }}
                onFocus={() => setUserTypeOpen(true)}
                placeholder="Search type..."
                autoComplete="off"
                disabled={!isCurrentAdmin && !isEditingAdmin}
              />
              {userTypeOpen && (isCurrentAdmin || isEditingAdmin) && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: "#fff",
                    border: "1px solid #ddd",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div
                    style={{ padding: "8px", color: "#666" }}
                    onClick={() => {
                      setFormData((p) => ({ ...p, userType: "" }));
                      setUserTypeSearch("");
                      setUserTypeOpen(false);
                    }}
                  >
                    Select Type
                  </div>
                  {(isCurrentAdmin
                    ? ["Admin User", "Customer User"]
                    : isEditingAdmin
                    ? ["Admin User"]
                    : ["Customer User"]) // although disabled covers this
                    .filter((t) => t.toLowerCase().includes((userTypeSearch || "").toLowerCase()))
                    .map((t) => (
                      <div
                        key={t}
                        style={{ padding: "8px", cursor: "pointer" }}
                        onClick={() => {
                          setFormData((p) => ({ ...p, userType: t }));
                          setUserTypeSearch(t);
                          setUserTypeOpen(false);
                        }}
                      >
                        {t}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </label>
        )}
        {!isCustomer && (
          <label>
            Company
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setCompanyOpen(true);
                }}
                onFocus={() => setCompanyOpen(true)}
                placeholder="Search company..."
                autoComplete="off"
              />
              {companyOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: "#fff",
                    border: "1px solid #ddd",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div
                    style={{ padding: "8px", color: "#666" }}
                    onClick={() => {
                      setFormData((p) => ({ ...p, company_id: "" }));
                      setCompanySearch("");
                      setCompanyOpen(false);
                    }}
                  >
                    -- Select Company --
                  </div>
                  {companies
                    .filter((c) => {
                      const label = c.companyName || c.name || "";
                      return label.toLowerCase().includes((companySearch || "").toLowerCase());
                    })
                    .map((c) => {
                      const label = c.companyName || c.name;
                      return (
                        <div
                          key={c.id}
                          style={{ padding: "8px", cursor: "pointer" }}
                          onClick={() => {
                            setFormData((p) => ({ ...p, company_id: String(c.id) }));
                            setCompanySearch(label);
                            setCompanyOpen(false);
                          }}
                        >
                          {label}
                        </div>
                      );
                    })}
                  {companies.filter((c) => {
                    const label = c.companyName || c.name || "";
                    return label.toLowerCase().includes((companySearch || "").toLowerCase());
                  }).length === 0 && (
                    <div style={{ padding: "8px", color: "#999" }}>No results</div>
                  )}
                </div>
              )}
            </div>
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
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setCountryOpen(true);
              }}
              onFocus={() => setCountryOpen(true)}
              placeholder="Search country..."
              autoComplete="off"
            />
            {countryOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: "#fff",
                  border: "1px solid #ddd",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div
                  style={{ padding: "8px", color: "#666" }}
                  onClick={() => {
                    setFormData((p) => ({ ...p, country: "", state: "", city: "" }));
                    setStates([]);
                    setCities([]);
                    setCountrySearch("");
                    setCountryOpen(false);
                  }}
                >
                  Select Country
                </div>
                {Object.keys(countryData)
                  .filter((c) => c.toLowerCase().includes((countrySearch || "").toLowerCase()))
                  .map((c) => (
                    <div
                      key={c}
                      style={{ padding: "8px", cursor: "pointer" }}
                      onClick={() => {
                        const newStates = Object.keys(countryData[c]?.states || {});
                        setStates(newStates);
                        setCities([]);
                        setFormData((p) => ({ ...p, country: c, state: "", city: "" }));
                        setCountrySearch(c);
                        setCountryOpen(false);
                      }}
                    >
                      {c}
                    </div>
                  ))}
                {Object.keys(countryData).filter((c) => c.toLowerCase().includes((countrySearch || "").toLowerCase())).length === 0 && (
                  <div style={{ padding: "8px", color: "#999" }}>No results</div>
                )}
              </div>
            )}
          </div>
        </label>
        <label>
          State
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={stateSearch}
              onChange={(e) => {
                setStateSearch(e.target.value);
                setStateOpen(true);
              }}
              onFocus={() => setStateOpen(true)}
              placeholder={!states.length ? "Select country first" : "Search state..."}
              autoComplete="off"
              disabled={!states.length}
            />
            {stateOpen && !!states.length && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: "#fff",
                  border: "1px solid #ddd",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div
                  style={{ padding: "8px", color: "#666" }}
                  onClick={() => {
                    setFormData((p) => ({ ...p, state: "", city: "" }));
                    setCities([]);
                    setStateSearch("");
                    setStateOpen(false);
                  }}
                >
                  Select State
                </div>
                {states
                  .filter((s) => s.toLowerCase().includes((stateSearch || "").toLowerCase()))
                  .map((s) => (
                    <div
                      key={s}
                      style={{ padding: "8px", cursor: "pointer" }}
                      onClick={() => {
                        const newCities = countryData[formData.country]?.states[s] || [];
                        setCities(newCities);
                        setFormData((p) => ({ ...p, state: s, city: "" }));
                        setStateSearch(s);
                        setStateOpen(false);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                {states.filter((s) => s.toLowerCase().includes((stateSearch || "").toLowerCase())).length === 0 && (
                  <div style={{ padding: "8px", color: "#999" }}>No results</div>
                )}
              </div>
            )}
          </div>
        </label>
        <label>
          City
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value);
                setCityOpen(true);
              }}
              onFocus={() => setCityOpen(true)}
              placeholder={!cities.length ? "Select state first" : "Search city..."}
              autoComplete="off"
              disabled={!cities.length}
            />
            {cityOpen && !!cities.length && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: "#fff",
                  border: "1px solid #ddd",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div
                  style={{ padding: "8px", color: "#666" }}
                  onClick={() => {
                    setFormData((p) => ({ ...p, city: "" }));
                    setCitySearch("");
                    setCityOpen(false);
                  }}
                >
                  Select City
                </div>
                {cities
                  .filter((c) => c.toLowerCase().includes((citySearch || "").toLowerCase()))
                  .map((c) => (
                    <div
                      key={c}
                      style={{ padding: "8px", cursor: "pointer" }}
                      onClick={() => {
                        setFormData((p) => ({ ...p, city: c }));
                        setCitySearch(c);
                        setCityOpen(false);
                      }}
                    >
                      {c}
                    </div>
                  ))}
                {cities.filter((c) => c.toLowerCase().includes((citySearch || "").toLowerCase())).length === 0 && (
                  <div style={{ padding: "8px", color: "#999" }}>No results</div>
                )}
              </div>
            )}
          </div>
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
