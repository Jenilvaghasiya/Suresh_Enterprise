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
import view1Img from "../assets/bill-previews/view3.png";
import view2Img from "../assets/bill-previews/view4.png";
import view3Img from "../assets/bill-previews/view2.png";
import view4Img from "../assets/bill-previews/view1.png";

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
    gstMasterId: 1,
    isActive: true,
    // Bill view URLs
    billView1: "",
    billView2: "",
    billView3: "",
    billView4: "",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  
  // Static invoice template images
  const templateImgs = {
    view1: view1Img,
    view2: view2Img,
    view3: view3Img,
    view4: view4Img,
  };
  const [selectedView, setSelectedView] = useState("view1");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const zoomStep = 0.2;
  const minZoom = 0.4;
  const maxZoom = 3;
  const handleZoomIn = () => setZoom((z) => Math.min(maxZoom, +(z + zoomStep).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(minZoom, +(z - zoomStep).toFixed(2)));
  const handleZoomReset = () => setZoom(1);

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
  const [gstSearch, setGstSearch] = useState("");
  const [gstOpen, setGstOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [stateOpen, setStateOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

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
        billView1: editCompany.billView1 || "",
        billView2: editCompany.billView2 || "",
        billView3: editCompany.billView3 || "",
        billView4: editCompany.billView4 || "",
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

      // initialize selected invoice template from edit data
      setSelectedView((editCompany.invoiceTemplate || "view1").toLowerCase());

    } else {
      setLogoPreview(null);
      setLogoFile(null);
      // reset to default template on create
      setSelectedView("view1");
    }
    setErrors({});
  }, [editCompany]);

  useEffect(() => {
    const gst = gstRates.find((g) => String(g.id) === String(formData.gstMasterId));
    setGstSearch(gst ? `${gst.gstRate}%` : "");
  }, [formData.gstMasterId, gstRates]);

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

    if (!editCompany && currentUser?.userType === "Customer User") {
      toast.error("Only admin can add a company");
      return;
    }

    const newErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    } else if (formData.companyName.trim().length < 3) {
      newErrors.companyName = "Company name must be at least 3 characters";
    }

    if (!formData.companyAddress.trim()) {
      newErrors.companyAddress = "Company address is required";
    }

    if (formData.companyGstNumber.trim()) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.companyGstNumber.trim())) {
        newErrors.companyGstNumber =
          "Invalid GST number format (e.g., 22AAAAA0000A1Z5)";
      }
    }

    if (!formData.companyAccountNumber.trim()) {
      newErrors.companyAccountNumber = "Account number is required";
    } else if (!/^\d{9,18}$/.test(formData.companyAccountNumber.trim())) {
      newErrors.companyAccountNumber = "Account number must be 9-18 digits";
    }

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = "Account holder name is required";
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = "IFSC code is required";
    } else if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())
    ) {
      newErrors.ifscCode = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    if (!formData.branchName.trim()) {
      newErrors.branchName = "Branch name is required";
    }

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
    formDataToSend.append("invoiceTemplate", selectedView);

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
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={gstSearch}
                onChange={(e) => {
                  setGstSearch(e.target.value);
                  setGstOpen(true);
                }}
                onFocus={() => setGstOpen(true)}
                placeholder="Search GST rate..."
                autoComplete="off"
              />
              {gstOpen && (
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
                  {gstRates
                    .filter((g) => `${g.gstRate}%`.toLowerCase().includes((gstSearch || "").toLowerCase()))
                    .map((g) => (
                      <div
                        key={g.id}
                        style={{ padding: "8px", cursor: "pointer" }}
                        onClick={() => {
                          setFormData((p) => ({ ...p, gstMasterId: g.id }));
                          setGstSearch(`${g.gstRate}%`);
                          setGstOpen(false);
                        }}
                      >
                        {g.gstRate}%
                      </div>
                    ))}
                  {gstRates.filter((g) => `${g.gstRate}%`.toLowerCase().includes((gstSearch || "").toLowerCase())).length === 0 && (
                    <div style={{ padding: "8px", color: "#999" }}>No results</div>
                  )}
                </div>
              )}
            </div>
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
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className={errors.country ? "input-error" : ""}
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
            {errors.country && (
              <small className="error-message">{errors.country}</small>
            )}
          </label>
          <label>
            State
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className={errors.state ? "input-error" : ""}
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
            {errors.state && (
              <small className="error-message">{errors.state}</small>
            )}
          </label>
          <label>
            City
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className={errors.city ? "input-error" : ""}
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

        <fieldset className="form-section">
          <legend>Invoice Templates</legend>
          <div className="bill-views-grid">
            {["view1", "view2", "view3", "view4"].map((viewKey, index) => (
              <label key={viewKey} className="bill-view-item">
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8}}>
                  <span>View {index + 1}</span>
                  <label style={{display:"flex", alignItems:"center", gap:6}}>
                    <input
                      type="radio"
                      name="invoiceView"
                      checked={selectedView === viewKey}
                      onChange={() => setSelectedView(viewKey)}
                    />
                    <span style={{fontSize:12,color:"#374151"}}>Select</span>
                  </label>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <img
                      src={templateImgs[viewKey]}
                      alt={`Bill View ${index + 1}`}
                      className="bill-view-thumb"
                      onClick={() => { setPreviewSrc(templateImgs[viewKey]); setZoom(1); setPreviewOpen(true); }}
                    />
                    <div style={{display:"flex", gap:8}}>
                      <button
                        type="button"
                        onClick={() => { setPreviewSrc(templateImgs[viewKey]); setZoom(1); setPreviewOpen(true); }}
                        className="preview-view-btn"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {previewOpen && (
          <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="zoom-toolbar">
                <button type="button" className="zoom-btn" onClick={handleZoomOut}>-</button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button type="button" className="zoom-btn" onClick={handleZoomIn}>+</button>
                <button type="button" className="zoom-btn" onClick={handleZoomReset}>Reset</button>
              </div>
              <div className="modal-image-container">
                <div style={{transform:`scale(${zoom})`, transformOrigin:"center center"}}>
                  <img src={previewSrc} alt="Invoice Preview" className="modal-image" />
                </div>
              </div>
              <div style={{display:"flex", justifyContent:"flex-end", marginTop:12}}>
                <button type="button" className="form-button" onClick={() => setPreviewOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
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