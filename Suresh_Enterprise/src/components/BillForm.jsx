import React, { useState, useEffect } from "react";
import "../styles/BillForm.css";
import {
  getCompanies,
  getCustomers,
  getProducts,
  getGstMasters,
  addInvoice,
  updateInvoice,
  safeApiCall,
} from "../services/api";
import { toast } from "../utils/toast";

const BillForm = ({ onFormSubmit, initialInvoice = null, onCancel }) => {
  const [formData, setFormData] = useState({
    billDate: new Date().toISOString().slice(0, 10),
    lrNumber: "",
    company_id: "",
    customer_id: "",
    transport: "",
    deliveryAt: "",
    gstMasterId: 1, // default GST
    items: [{ product_id: "", quantity: 1, rate: 0, tax: 0, total: 0 }],
  });

  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [calculatedTotals, setCalculatedTotals] = useState({
    grandTotal: 0,
    totalTax: 0,
    sgst: 0,
    cgst: 0,
    igst: 0,
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [userDetail, setUserDetail] = useState(null);
  const isCustomer = currentUser?.userType === "Customer User";
  const [companySearch, setCompanySearch] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [gstSearch, setGstSearch] = useState("");
  const [gstOpen, setGstOpen] = useState(false);
  const [productSearch, setProductSearch] = useState([]);
  const [productOpen, setProductOpen] = useState([]);

  // Get user ID from localStorage
  const getUserId = () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      return userData?.id || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const [compData, compError] = await safeApiCall(getCompanies);
      const [custData, custError] = await safeApiCall(getCustomers);
      const [prodData, prodError] = await safeApiCall(getProducts);
      const [gstData, gstError] = await safeApiCall(getGstMasters);

      if (compError || custError || prodError || gstError) {
        toast.error("Failed to load form data");
        return;
      }

      const allCompanies = compData?.data || [];
      const allCustomers = custData?.data || [];
      const allProducts = prodData?.data || [];

      const scopedCompanies = (currentUser?.userType === "Customer User")
        ? allCompanies.filter((c) => c.id === currentUser?.company_id)
        : allCompanies;
      const scopedCustomers = (currentUser?.userType === "Customer User")
        ? allCustomers.filter((c) => c.company_id === currentUser?.company_id)
        : allCustomers;
      const scopedProducts = (currentUser?.userType === "Customer User")
        ? allProducts.filter((p) => p.company_id === currentUser?.company_id)
        : allProducts;

      setCompanies(scopedCompanies);
      setCustomers(scopedCustomers);
      setProducts(scopedProducts);
      setGstRates(gstData?.data || []);

      // Preselect company for customer users
      if ((currentUser?.userType === "Customer User") && currentUser?.company_id) {
        setFormData((prev) => ({ ...prev, company_id: String(currentUser.company_id) }));
        // If selected company has gstMasterId, set it (we'll also re-set when user changes via handler)
        const selectedCompany = scopedCompanies.find((c) => c.id === currentUser.company_id);
        if (selectedCompany?.gstMasterId) {
          setFormData((prev) => ({ ...prev, gstMasterId: selectedCompany.gstMasterId }));
        }
      }
    };
    fetchData();
  }, []);

  // Prefill when editing
  useEffect(() => {
    if (!initialInvoice) return;
    try {
      setFormData({
        billDate: initialInvoice.billDate ? initialInvoice.billDate.slice(0, 10) : "",
        lrNumber: initialInvoice.lrNumber || "",
        company_id: String(initialInvoice.companyProfileId || ""),
        customer_id: String(initialInvoice.customerId || ""),
        transport: initialInvoice.transport || "",
        deliveryAt: initialInvoice.deliveryAt || "",
        gstMasterId: initialInvoice.gstMasterId || 1,
        items: (initialInvoice.invoiceItems || []).map((it) => ({
          product_id: parseInt(it.productId),
          quantity: parseFloat(it.quantity) || 1,
          rate: parseFloat(it.rate) || 0,
          tax: 0,
          total: parseFloat((parseFloat(it.rate || 0) * parseFloat(it.quantity || 0)).toFixed(2)),
          hsnCode: it.hsnCode || "",
          uom: it.uom || "PCS",
        }))
      });
    } catch {}
  }, [initialInvoice]);

  // Fetch detailed user info (withGst/withoutGst) using the ID from localStorage/currentUser
  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        const id = getUserId();
        if (!id) return;
        const res = await fetch(`http://localhost:3000/api/users/${id}`);
        if (!res.ok) throw new Error("Failed to fetch user detail");
        const json = await res.json();
        if (json?.success && json?.data) {
          setUserDetail(json.data);
        }
      } catch (err) {
        console.error("Error fetching user detail:", err);
      }
    };
    fetchUserDetail();
  }, []);

  // Sync search labels when selections or lists change
  useEffect(() => {
    const comp = companies.find((c) => String(c.id) === String(formData.company_id));
    setCompanySearch(comp ? (comp.companyName || comp.name) : "");
  }, [formData.company_id, companies]);

  useEffect(() => {
    const cust = customers.find((c) => String(c.id) === String(formData.customer_id));
    setCustomerSearch(cust ? (cust.customerName || cust.name) : "");
  }, [formData.customer_id, customers]);

  useEffect(() => {
    const gst = gstRates.find((g) => String(g.id) === String(formData.gstMasterId));
    setGstSearch(gst ? `${gst.gstRate}%` : "");
  }, [formData.gstMasterId, gstRates]);

  useEffect(() => {
    // Ensure product search arrays align with items
    const labels = formData.items.map((it) => {
      const p = products.find((pr) => String(pr.id) === String(it.product_id));
      return p ? (p.productName || p.name) : "";
    });
    setProductSearch(labels);
    setProductOpen((prev) => {
      const next = Array(formData.items.length).fill(false);
      return next;
    });
  }, [formData.items, products]);

  useEffect(() => {
    const selectedCustomer = customers.find(
      (c) => c.id === parseInt(formData.customer_id)
    );

    if (selectedCustomer && selectedCustomer.withGst === false) {
      const zeroGstRate = gstRates.find((g) => g.gstRate === 0);
      if (zeroGstRate) {
        setFormData((prev) => ({ ...prev, gstMasterId: zeroGstRate.id }));
      }
    }
  }, [formData.customer_id, customers, gstRates]);

  // Separate useEffect for tax and total calculations
  useEffect(() => {
    const selectedRate =
      gstRates.find((g) => g.id === parseInt(formData.gstMasterId))?.gstRate || 0;
    // If user's withGst is explicitly false, treat GST rate as 0
    const gstRate = (userDetail?.withGst === false) ? 0 : selectedRate;

    // Get selected customer and company to check state
    const selectedCustomer = customers.find(
      (c) => c.id === parseInt(formData.customer_id)
    );
    const selectedCompany = companies.find(
      (c) => c.id === parseInt(formData.company_id)
    );

    // Determine tax type based on location:
    // 1. If customer has no stateCode -> Outside India -> IGST
    // 2. If customer has stateCode but different from company -> Interstate (within India) -> IGST
    // 3. If customer has same stateCode as company -> Intrastate (same state) -> SGST + CGST

    let isInterstate = false;
    let isOutsideIndia = false;

    if (selectedCustomer && selectedCompany) {
      // Extract company state code from GST number (first 2 digits)
      const companyStateCode = selectedCompany.companyGstNumber
        ? selectedCompany.companyGstNumber.substring(0, 2)
        : null;

      // Check if customer is outside India (no stateCode or stateCode is null/empty)
      if (
        !selectedCustomer.stateCode ||
        selectedCustomer.stateCode.trim() === ""
      ) {
        isOutsideIndia = true;
        isInterstate = true; // Use IGST for outside India
      } else if (
        companyStateCode &&
        selectedCustomer.stateCode !== companyStateCode
      ) {
        // Different states within India
        isInterstate = true;
      }
    }

    const updatedItems = formData.items.map((item) => {
      const tax = ((item.quantity * item.rate * gstRate) / 100).toFixed(2);
      const total = (item.quantity * item.rate + parseFloat(tax)).toFixed(2);
      return { ...item, tax: parseFloat(tax), total: parseFloat(total) };
    });

    const grandTotal = updatedItems
      .reduce((acc, item) => acc + parseFloat(item.total), 0)
      .toFixed(2);
    const totalTax = updatedItems
      .reduce((acc, item) => acc + parseFloat(item.tax), 0)
      .toFixed(2);

    // Apply IGST for interstate/outside India, SGST+CGST for intrastate
    let sgst = 0;
    let cgst = 0;
    let igst = 0;

    if (isInterstate) {
      // Interstate or Outside India: Apply IGST only
      igst = parseFloat(totalTax);
      sgst = 0;
      cgst = 0;
    } else {
      // Intrastate (same state within India): Apply SGST + CGST
      sgst = parseFloat((totalTax / 2).toFixed(2));
      cgst = parseFloat((totalTax / 2).toFixed(2));
      igst = 0;
    }

    setCalculatedTotals({
      grandTotal: parseFloat(grandTotal),
      totalTax: parseFloat(totalTax),
      sgst,
      cgst,
      igst,
      isInterstate,
      isOutsideIndia,
    });

    // Update items only if tax/total actually changed to avoid loops
    const itemsChanged = formData.items.some((item, idx) =>
      item.tax !== updatedItems[idx].tax || item.total !== updatedItems[idx].total
    );
    if (itemsChanged) {
      setFormData((prev) => ({ ...prev, items: updatedItems }));
    }
  }, [
    formData.gstMasterId,
    formData.customer_id,
    formData.company_id,
    formData.items,
    customers,
    companies,
    gstRates,
    userDetail?.withGst,
  ]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { product_id: "", quantity: 1, rate: 0, tax: 0, total: 0 },
      ],
    });
  };

  const removeItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    if (field === "product_id") {
      const product = products.find((p) => p.id === parseInt(value));
      if (product) {
        newItems[index].product_id = product.id;
        newItems[index].rate = product.price || 0;
        newItems[index].hsnCode = product.hsnCode || "";
        newItems[index].uom = product.uom || "PCS";
      } else {
        newItems[index].rate = 0;
        newItems[index].hsnCode = "";
        newItems[index].uom = "PCS";
      }
    } else {
      newItems[index][field] =
        field === "quantity" || field === "rate"
          ? parseFloat(value) || 0
          : value;
    }

    // useEffect will handle calculations
    setFormData({ ...formData, items: newItems });

    // Clear error for this item
    if (errors[`item_${index}`]) {
      setErrors((prev) => ({ ...prev, [`item_${index}`]: null }));
    }
  };

  const handleGstChange = (e) => {
    const gstMasterId = e.target.value;
    setFormData((prev) => ({ ...prev, gstMasterId }));
    // useEffect will handle recalculations
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate required fields
    if (!formData.billDate) {
      newErrors.billDate = "Bill date is required";
    }
    if (!formData.company_id || formData.company_id === "") {
      newErrors.company_id = "Company is required";
    }
    if (!formData.customer_id || formData.customer_id === "") {
      newErrors.customer_id = "Customer is required";
    }
    if (!formData.transport.trim()) {
      newErrors.transport = "Transport is required";
    }
    if (!formData.deliveryAt.trim()) {
      newErrors.deliveryAt = "Delivery location is required";
    }

    // Validate items
    if (formData.items.length === 0) {
      newErrors.items = "At least one item is required";
    } else {
      formData.items.forEach((item, index) => {
        if (!item.product_id) {
          newErrors[`item_${index}`] = "Product is required";
        }
        if (!item.quantity || item.quantity <= 0) {
          newErrors[`item_${index}_qty`] = "Quantity must be greater than 0";
        }
      });
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return;
    }

    setLoading(true);

    // Calculate total assessed value (sum of all item amounts before tax)
    const totalAssesValue = formData.items.reduce((sum, item) => {
      const itemAmount = parseFloat(item.rate) * parseFloat(item.quantity);
      return sum + itemAmount;
    }, 0);

    // Get GST rate
    const selectedGst = gstRates.find(
      (g) => g.id === parseInt(formData.gstMasterId)
    );
    const baseGstRate = selectedGst?.gstRate || 18;
    const gstRate = (userDetail?.withGst === false) ? 0 : baseGstRate;

    // Get userId from localStorage
    const userId = getUserId();

    // Prepare payload with proper field names for backend
    const isInterstate = !!calculatedTotals.isInterstate;
    const payload = {
      billDate: formData.billDate,
      lrNumber: formData.lrNumber || "",
      companyProfileId: parseInt((currentUser?.userType === "Customer User") && currentUser?.company_id ? currentUser.company_id : formData.company_id),
      customerId: parseInt(formData.customer_id),
      transport: formData.transport,
      deliveryAt: formData.deliveryAt,
      gstMasterId: parseInt(formData.gstMasterId),
      user_id: userId, // Add userId to payload
      totalAssesValue: parseFloat(totalAssesValue.toFixed(2)),
      sgstRate: isInterstate ? 0 : gstRate / 2,
      cgstRate: isInterstate ? 0 : gstRate / 2,
      igstRate: isInterstate ? gstRate : 0,
      sgstAmount: parseFloat(parseFloat(calculatedTotals.sgst || 0).toFixed(2)),
      cgstAmount: parseFloat(parseFloat(calculatedTotals.cgst || 0).toFixed(2)),
      igstAmount: parseFloat(parseFloat(calculatedTotals.igst || 0).toFixed(2)),
      billValue: parseFloat(
        parseFloat(calculatedTotals.grandTotal || 0).toFixed(2)
      ),
      items: formData.items.map((item) => ({
        productId: parseInt(item.product_id),
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        // Backend expects pre-tax line amount
        amount: parseFloat((parseFloat(item.rate) * parseFloat(item.quantity)).toFixed(2)),
        hsnCode: item.hsnCode || "",
        uom: item.uom || "PCS",
      })),
    };

    console.log("Payload being sent:", payload);

    try {
      let data, error;
      if (initialInvoice?.id) {
        [data, error] = await safeApiCall(updateInvoice, initialInvoice.id, payload);
      } else {
        [data, error] = await safeApiCall(addInvoice, payload);
      }
      if (error) {
        toast.error(error);
      } else {
        toast.success(initialInvoice?.id ? "Invoice updated successfully!" : "Invoice created successfully!");

        // Reset form
        setFormData({
          billDate: "",
          lrNumber: "",
          company_id: "",
          customer_id: "",
          transport: "",
          deliveryAt: "",
          gstMasterId: 1,
          items: [{ product_id: "", quantity: 1, rate: 0, tax: 0, total: 0 }],
        });
        setErrors({});

        if (onFormSubmit) onFormSubmit();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bill-form-container">
      <h3>{initialInvoice ? "Edit Invoice" : "Create an Invoice"}</h3>
      <form onSubmit={handleSubmit}>
        <div className="bill-top-split">
          <div className="customer-details-card">
            <h4 style={{ marginTop: 0, marginBottom: 12, color: "#165638" }}>Customer Details</h4>
            {(() => {
              const selectedCustomer = customers.find((c) => c.id === parseInt(formData.customer_id));
              if (!selectedCustomer) {
                return (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Select a customer to view details.</div>
                );
              }
              return (
                <div className="customer-details-grid">
                  <div><span className="cd-label">Name</span><span className="cd-value">{selectedCustomer.customerName || selectedCustomer.name || "-"}</span></div>
                  <div><span className="cd-label">GST No.</span><span className="cd-value">{selectedCustomer.gstNumber || "-"}</span></div>
                  <div><span className="cd-label">Contact No.</span><span className="cd-value">{selectedCustomer.contactNumber || "-"}</span></div>
                  <div><span className="cd-label">Email Address</span><span className="cd-value">{selectedCustomer.emailAddress || "-"}</span></div>
                  <div><span className="cd-label">Billing Address</span><span className="cd-value">{selectedCustomer.billingAddress || "-"}</span></div>
                  <div><span className="cd-label">Shipping Address</span><span className="cd-value">{selectedCustomer.shippingAddress || "-"}</span></div>
                </div>
              );
            })()}
          </div>

          <div className="form-grid">
            <label>
              Bill Date:
              <input
                type="date"
                className={errors.billDate ? "input-error" : ""}
                value={formData.billDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setFormData({ ...formData, billDate: e.target.value });
                  if (errors.billDate)
                    setErrors((prev) => ({ ...prev, billDate: null }));
                }}
              />
              {errors.billDate && (
                <small className="error-message">{errors.billDate}</small>
              )}
            </label>
            <label>
              L.R. Number:
              <input
                type="text"
                value={formData.lrNumber}
                onChange={(e) =>
                  setFormData({ ...formData, lrNumber: e.target.value })
                }
              />
            </label>
            {!isCustomer && (
              <label>
                Company:
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className={errors.company_id ? "input-error" : ""}
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
                          setFormData({ ...formData, company_id: "" });
                          setCompanySearch("");
                          setCompanyOpen(false);
                          if (errors.company_id)
                            setErrors((prev) => ({ ...prev, company_id: null }));
                        }}
                      >
                        Select Company
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
                                // Auto-set GST from company if present
                                if (c.gstMasterId) {
                                  setFormData({ ...formData, company_id: String(c.id), gstMasterId: c.gstMasterId });
                                } else {
                                  setFormData({ ...formData, company_id: String(c.id) });
                                }
                                setCompanySearch(label);
                                setCompanyOpen(false);
                                if (errors.company_id)
                                  setErrors((prev) => ({ ...prev, company_id: null }));
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
                {errors.company_id && (
                  <small className="error-message">{errors.company_id}</small>
                )}
              </label>
            )}
            <label>
              Customer:
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className={errors.customer_id ? "input-error" : ""}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerOpen(true);
                  }}
                  onFocus={() => setCustomerOpen(true)}
                  placeholder="Search customer..."
                  autoComplete="off"
                />
                {customerOpen && (
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
                        setFormData({ ...formData, customer_id: "" });
                        setCustomerSearch("");
                        setCustomerOpen(false);
                        if (errors.customer_id)
                          setErrors((prev) => ({ ...prev, customer_id: null }));
                      }}
                    >
                      Select Customer
                    </div>
                    {customers
                      .filter((c) => {
                        const label = c.customerName || c.name || "";
                        return label.toLowerCase().includes((customerSearch || "").toLowerCase());
                      })
                      .map((c) => {
                        const label = c.customerName || c.name;
                        return (
                          <div
                            key={c.id}
                            style={{ padding: "8px", cursor: "pointer" }}
                            onClick={() => {
                              setFormData({ ...formData, customer_id: String(c.id) });
                              setCustomerSearch(label);
                              setCustomerOpen(false);
                              if (errors.customer_id)
                                setErrors((prev) => ({ ...prev, customer_id: null }));
                            }}
                          >
                            {label}
                          </div>
                        );
                      })}
                    {customers.filter((c) => {
                      const label = c.customerName || c.name || "";
                      return label.toLowerCase().includes((customerSearch || "").toLowerCase());
                    }).length === 0 && (
                      <div style={{ padding: "8px", color: "#999" }}>No results</div>
                    )}
                  </div>
                )}
              </div>
              {errors.customer_id && (
                <small className="error-message">{errors.customer_id}</small>
              )}
            </label>
            <label>
              Transport:
              <input
                type="text"
                className={errors.transport ? "input-error" : ""}
                value={formData.transport}
                onChange={(e) => {
                  setFormData({ ...formData, transport: e.target.value });
                  if (errors.transport)
                    setErrors((prev) => ({ ...prev, transport: null }));
                }}
                placeholder="Enter transport name"
              />
              {errors.transport && (
                <small className="error-message">{errors.transport}</small>
              )}
            </label>
            <label>
              Delivery At:
              <input
                type="text"
                className={errors.deliveryAt ? "input-error" : ""}
                value={formData.deliveryAt}
                onChange={(e) => {
                  setFormData({ ...formData, deliveryAt: e.target.value });
                  if (errors.deliveryAt)
                    setErrors((prev) => ({ ...prev, deliveryAt: null }));
                }}
                placeholder="Enter delivery location"
              />
              {errors.deliveryAt && (
                <small className="error-message">{errors.deliveryAt}</small>
              )}
            </label>
            <label>
              {userDetail?.withGst === false ? (
                <>
                
                </>
              ) : (
                <>
                  GST Rate:
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
                          .map((g) => {
                            const selectedCustomer = customers.find(
                              (c) => c.id === parseInt(formData.customer_id)
                            );
                            let isExclusivelyWithGst = false;
                            if (selectedCustomer) {
                              isExclusivelyWithGst = selectedCustomer.withGst && !selectedCustomer.withoutGst;
                            } else if (userDetail) {
                              isExclusivelyWithGst = userDetail.withGst && !userDetail.withoutGst;
                            }
                            const isDisabled = isExclusivelyWithGst && g.gstRate === 0;
                            return (
                              <div
                                key={g.id}
                                style={{ padding: "8px", cursor: isDisabled ? "not-allowed" : "pointer", color: isDisabled ? "#9ca3af" : "inherit" }}
                                onClick={() => {
                                  if (isDisabled) return;
                                  setFormData((p) => ({ ...p, gstMasterId: g.id }));
                                  setGstSearch(`${g.gstRate}%`);
                                  setGstOpen(false);
                                }}
                              >
                                {g.gstRate}%{isDisabled ? " (not allowed)" : ""}
                              </div>
                            );
                          })}
                        {gstRates.filter((g) => `${g.gstRate}%`.toLowerCase().includes((gstSearch || "").toLowerCase())).length === 0 && (
                          <div style={{ padding: "8px", color: "#999" }}>No results</div>
                        )}
                      </div>
                    )}
                  </div>
                  <small
                    style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}
                  >
                    Auto-selected from company (can be changed)
                  </small>
                </>
              )}
            </label>
          </div>
        </div>

        <h4>Invoice Items</h4>
        <div className="bill-items-table">
          <div className="bill-items-header">
            <span>Sr.</span>
            <span>Product</span>
            <span>HSN Code</span>
            <span>UOM</span>
            <span>Qty</span>
            <span>Rate</span>
            <span>Tax</span>
            <span>Total</span>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="bill-items">
              <div className="bill-item-field"><span className="mobile-label">Sr.</span><span>{index + 1}</span></div>
              <div className="bill-item-field"><span className="mobile-label">Product</span>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className={errors[`item_${index}`] ? "input-error" : ""}
                    value={productSearch[index] || ""}
                    onChange={(e) => {
                      const next = [...productSearch];
                      next[index] = e.target.value;
                      setProductSearch(next);
                      setProductOpen((prev) => {
                        const arr = [...prev];
                        arr[index] = true;
                        return arr;
                      });
                    }}
                    onFocus={() =>
                      setProductOpen((prev) => {
                        const arr = [...prev];
                        arr[index] = true;
                        return arr;
                      })
                    }
                    placeholder="Search product..."
                    autoComplete="off"
                  />
                  {productOpen[index] && (
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
                          handleItemChange(index, "product_id", "");
                          setProductSearch((prev) => {
                            const arr = [...prev];
                            arr[index] = "";
                            return arr;
                          });
                          setProductOpen((prev) => {
                            const arr = [...prev];
                            arr[index] = false;
                            return arr;
                          });
                        }}
                      >
                        Select Product
                      </div>
                      {products
                        .filter((p) => {
                          const label = p.productName || p.name || "";
                          return label.toLowerCase().includes(((productSearch[index] || "").toLowerCase()));
                        })
                        .map((p) => {
                          const label = p.productName || p.name;
                          return (
                            <div
                              key={p.id}
                              style={{ padding: "8px", cursor: "pointer" }}
                              onClick={() => {
                                handleItemChange(index, "product_id", String(p.id));
                                setProductSearch((prev) => {
                                  const arr = [...prev];
                                  arr[index] = label;
                                  return arr;
                                });
                                setProductOpen((prev) => {
                                  const arr = [...prev];
                                  arr[index] = false;
                                  return arr;
                                });
                              }}
                            >
                              {label}
                            </div>
                          );
                        })}
                      {products.filter((p) => {
                        const label = p.productName || p.name || "";
                        return label.toLowerCase().includes(((productSearch[index] || "").toLowerCase()));
                      }).length === 0 && (
                        <div style={{ padding: "8px", color: "#999" }}>No results</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bill-item-field"><span className="mobile-label">HSN Code</span>
                <input
                  type="text"
                  value={item.hsnCode || "-"}
                  readOnly
                  placeholder="HSN"
                  style={{ backgroundColor: "#f9fafb" }}
                />
              </div>
              <div className="bill-item-field"><span className="mobile-label">UOM</span>
                <input
                  type="text"
                  value={item.uom || "-"}
                  readOnly
                  placeholder="UOM"
                  style={{ backgroundColor: "#f9fafb" }}
                />
              </div>
              <div className="bill-item-field"><span className="mobile-label">Qty</span>
                <input
                  type="number"
                  min="1"
                  className={errors[`item_${index}_qty`] ? "input-error" : ""}
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, "quantity", e.target.value)
                  }
                />
              </div>
              <div className="bill-item-field"><span className="mobile-label">Rate</span>
                <input
                  type="number"
                  min="0"
                  value={item.rate}
                  readOnly
                  style={{ backgroundColor: "#f9fafb" }}
                />
              </div>
              <div className="bill-item-field"><span className="mobile-label">Tax</span>
                <input
                  type="number"
                  value={item.tax}
                  readOnly
                  style={{ backgroundColor: "#f9fafb" }}
                />
              </div>
              <div className="bill-item-field"><span className="mobile-label">Total</span>
                <input
                  type="text"
                  value={item.total}
                  readOnly
                  style={{ backgroundColor: "#f9fafb" }}
                />
              </div>
            </div>
          ))}

          <div className="buttons-add-delete">
            <button
              type="button"
              className="bill-add-item-button"
              onClick={addItem}
            >
              Add Item
            </button>
            <button
              type="button"
              className="bill-delete-item-button"
              onClick={() => removeItem(formData.items.length - 1)}
            >
              Remove Item
            </button>
          </div>
        </div>

        <div className="totals-section">
          {calculatedTotals.isInterstate ? (
            <>
              <h4 style={{ color: "#dc2626" }}>
                IGST{" "}
                {calculatedTotals.isOutsideIndia
                  ? "(Outside India)"
                  : "(Interstate)"}
                : ₹{calculatedTotals.igst.toFixed(2)}
              </h4>
              <h4 style={{ color: "#9ca3af" }}>SGST: ₹0.00</h4>
              <h4 style={{ color: "#9ca3af" }}>CGST: ₹0.00</h4>
            </>
          ) : (
            <>
              <h4 style={{ color: "#9ca3af" }}>IGST: ₹0.00</h4>
              <h4 style={{ color: "#16a34a" }}>
                SGST (Same State): ₹{calculatedTotals.sgst.toFixed(2)}
              </h4>
              <h4 style={{ color: "#16a34a" }}>
                CGST (Same State): ₹{calculatedTotals.cgst.toFixed(2)}
              </h4>
            </>
          )}
          <h4 className="grand-total-text">
            Grand Total: ₹{calculatedTotals.grandTotal.toFixed(2)}
          </h4>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="bill-form-button" disabled={loading}>
            {loading ? (initialInvoice ? "Saving..." : "Generating...") : (initialInvoice ? "Save Changes" : "Generate Invoice")}
          </button>
          {initialInvoice && (
            <button type="button" className="bill-delete-item-button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default BillForm;