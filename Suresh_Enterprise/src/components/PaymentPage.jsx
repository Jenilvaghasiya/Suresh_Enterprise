import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import '../styles/PaymentPage.css';
import { safeApiCall, getCustomers, getCustomerBalance, addPayment, createRazorpayOrder, getInvoicesByCompanyId, getInvoicesByUserId } from "../services/api";
import { AlertTriangle, Save, CreditCard } from "lucide-react";

const useQuery = () => new URLSearchParams(useLocation().search);

const PaymentPage = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const preselectCustomerId = query.get("customerId");

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectCustomerId || "");
  const [companyId, setCompanyId] = useState(null);
  const [balance, setBalance] = useState({ currentBalance: 0, openingBalance: 0, invoiceTotal: 0, paid: 0 });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const filteredInvoices = useMemo(() => {
    const list = Array.isArray(invoices) ? invoices : [];
    const mine = list.filter(inv => String(inv.customerId) === String(selectedCustomerId));
    const withOutstanding = mine.filter(inv => {
      const total = Number(inv.billValue ?? inv.totalAmount ?? 0);
      const paid = Number(inv.paidAmount ?? 0);
      return total - paid > 0;
    });
    // Sort by billDate desc
    return withOutstanding.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
  }, [invoices, selectedCustomerId]);

  const invoiceSummary = useMemo(() => {
    const count = filteredInvoices.length;
    const outstanding = filteredInvoices.reduce((sum, inv) => {
      const total = Number(inv.billValue ?? inv.totalAmount ?? 0);
      const paid = Number(inv.paidAmount ?? 0);
      return sum + (total - paid);
    }, 0);
    return { count, outstanding };
  }, [filteredInvoices]);

  // Form fields
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);
  const isCustomerUser = currentUser?.userType === "Customer User";

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      const [res, err] = await safeApiCall(getCustomers);
      if (err) {
        setError("Failed to load customers");
      } else {
        const list = Array.isArray(res?.data) ? res.data : [];
        const scoped = isCustomerUser && currentUser?.company_id
          ? list.filter(c => c.company_id === currentUser.company_id)
          : list;
        setCustomers(scoped);
        if (!preselectCustomerId && scoped.length > 0) {
          setSelectedCustomerId(String(scoped[0].id));
        }
      }
      setLoading(false);
    };
    loadCustomers();
  }, [isCustomerUser, currentUser, preselectCustomerId]);

  // Load company id when customer selected
  useEffect(() => {
    if (!selectedCustomerId) return;
    const cust = customers.find(c => String(c.id) === String(selectedCustomerId));
    if (cust) setCompanyId(cust.company_id);
    setSelectedInvoiceId("");
  }, [selectedCustomerId, customers]);

  // Load invoices depending on role (Customer User -> user invoices; else -> company invoices), then filter by selected customer
  useEffect(() => {
    const loadInvoices = async () => {
      if (!selectedCustomerId) return;
      let res, err;
      if (isCustomerUser && currentUser?.id) {
        [res, err] = await safeApiCall(getInvoicesByUserId, currentUser.id);
      } else {
        if (!companyId) return;
        [res, err] = await safeApiCall(getInvoicesByCompanyId, companyId);
      }
      if (err) return; // keep silent, user can still pay without linking invoice
      const list = Array.isArray(res?.data) ? res.data : [];
      setInvoices(list);
    };
    loadInvoices();
  }, [companyId, selectedCustomerId, isCustomerUser, currentUser]);

  // Default select most recent unpaid invoice when list first loads
  useEffect(() => {
    if (isCustomerUser && !selectedInvoiceId && filteredInvoices.length > 0) {
      setSelectedInvoiceId(String(filteredInvoices[0].id));
    }
  }, [filteredInvoices, selectedInvoiceId, isCustomerUser]);

  // Load balance when customer changes
  useEffect(() => {
    const loadBalance = async () => {
      if (!selectedCustomerId) return;
      const [res] = await safeApiCall(getCustomerBalance, selectedCustomerId);
      setBalance(res?.data || { currentBalance: 0, openingBalance: 0, invoiceTotal: 0, paid: 0 });
    };
    loadBalance();
  }, [selectedCustomerId]);

  const resetForm = () => {
    setAmount("");
    setMode("Cash");
    setRemarks("");
    setChequeDate("");
    setBankName("");
    setIfsc("");
    setSelectedInvoiceId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !companyId) {
      setError("Please select a customer");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError("");
    setSubmitting(true);
    const payload = {
      customerId: Number(selectedCustomerId),
      companyProfileId: Number(companyId),
      amount: Number(amount),
      mode_payment: mode,
      remarks,
      cheque_date: mode === "Cheque" ? chequeDate || null : null,
      bank_name: mode === "Cheque" ? bankName || null : null,
      ifsc_code: mode === "Cheque" ? ifsc || null : null,
      invoiceId: isCustomerUser && selectedInvoiceId ? Number(selectedInvoiceId) : null,
    };
    const [res, err] = await safeApiCall(addPayment, payload);
    setSubmitting(false);
    if (err) {
      setError(typeof err === "string" ? err : "Payment failed");
      return;
    }
    resetForm();
    // Refresh balance
    const [bal] = await safeApiCall(getCustomerBalance, selectedCustomerId);
    setBalance(bal?.data || balance);
  };

  // Razorpay checkout
  const ensureRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });

  const handleRazorpay = async () => {
    if (!selectedCustomerId || !companyId) {
      setError("Please select a customer");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await ensureRazorpayScript();
      const [orderRes, orderErr] = await safeApiCall(createRazorpayOrder, {
        amount: Number(amount),
        currency: "INR",
        receipt: `cust_${selectedCustomerId}_${Date.now()}`,
      });
      if (orderErr || !orderRes?.data) {
        setError(orderErr || "Failed to create Razorpay order");
        setSubmitting(false);
        return;
      }
      const { data: order, key } = orderRes;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Suresh Enterprise",
        description: "Customer Payment",
        order_id: order.id,
        handler: async function (response) {
          const payload = {
            customerId: Number(selectedCustomerId),
            companyProfileId: Number(companyId),
            amount: Number(amount),
            mode_payment: "Online",
            remarks: `Razorpay: ${response.razorpay_payment_id}`,
            invoiceId: isCustomerUser && selectedInvoiceId ? Number(selectedInvoiceId) : null,
          };
          await safeApiCall(addPayment, payload);
          const [bal] = await safeApiCall(getCustomerBalance, selectedCustomerId);
          setBalance(bal?.data || balance);
          resetForm();
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        notes: {
          customerId: String(selectedCustomerId),
        },
        theme: { color: "#165638" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setError(resp?.error?.description || "Payment failed");
      });
      rzp.open();
    } catch (e) {
      setError(e.message || "Razorpay failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: "0 auto",
      padding: "24px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 32
      }}>
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#165638",
          margin: 0,
          marginBottom: 8
        }}>Make Payment</h2>
        <p style={{
          color: "#6b7280",
          margin: 0,
          fontSize: 14
        }}>Process customer payments securely</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
          border: "1px solid #f87171",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 2px 8px rgba(248, 113, 113, 0.15)"
        }}>
          <AlertTriangle size={20} color="#991b1b" aria-hidden="true" />
          <span style={{ color: "#991b1b", fontSize: 14, fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Customer & Balance Card */}
      <div style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
        border: "2px solid #e5e7eb",
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20
        }}>
          <div>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "2px solid #d1d5db",
                borderRadius: 10,
                fontSize: 15,
                color: "#1f2937",
                background: "#ffffff",
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "#165638"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            >
              <option value="" disabled>Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>Current Balance</label>
            <div style={{
              width: "100%",
              padding: "12px 14px",
              border: "2px solid #d1d5db",
              borderRadius: 10,
              fontSize: 18,
              fontWeight: 700,
              color: "#165638",
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
            }}>
              ₹{Number(balance.currentBalance || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} style={{
        background: "#ffffff",
        border: "2px solid #e5e7eb",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20
        }}>
          <div>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>Amount to Pay</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.00"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "2px solid #d1d5db",
                borderRadius: 10,
                fontSize: 15,
                color: "#1f2937",
                background: "#ffffff",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "#165638"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>
          <div>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>Payment Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "2px solid #d1d5db",
                borderRadius: 10,
                fontSize: 15,
                color: "#1f2937",
                background: "#ffffff",
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "#165638"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            >
              <option>Cash</option>
              <option>NEFT</option>
              <option>RTGS</option>
              <option>Cheque</option>
              <option>Others</option>
            </select>
          </div>
          {isCustomerUser && filteredInvoices.length > 0 && (
            <div className="payment-grid-full">
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>Invoice (optional)</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: 15,
                  color: "#1f2937",
                  background: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#165638"}
                onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
              >
                <option value="">-- Link to an invoice (optional) --</option>
                {filteredInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {`#${inv.billNumber || inv.invoiceNumber || inv.id} • ₹${Number((inv.billValue ?? inv.totalAmount) || 0).toFixed(2)} (paid ₹${Number(inv.paidAmount || 0).toFixed(2)}) • due ₹${(Number(inv.billValue ?? inv.totalAmount ?? 0) - Number(inv.paidAmount ?? 0)).toFixed(2)} • ${new Date(inv.billDate).toLocaleDateString()}`}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                {invoiceSummary.count} unpaid invoice(s). Total due: ₹{invoiceSummary.outstanding.toFixed(2)}
              </div>
            </div>
          )}
          {mode === "Cheque" && (
            <>
              <div>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Cheque Date</label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "2px solid #d1d5db",
                    borderRadius: 10,
                    fontSize: 15,
                    color: "#1f2937",
                    background: "#ffffff",
                    transition: "all 0.2s ease",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#165638"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
              </div>
              <div>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Bank Name</label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Enter bank name"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "2px solid #d1d5db",
                    borderRadius: 10,
                    fontSize: 15,
                    color: "#1f2937",
                    background: "#ffffff",
                    transition: "all 0.2s ease",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#165638"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>IFSC Code</label>
                <input
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  placeholder="Enter IFSC code"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "2px solid #d1d5db",
                    borderRadius: 10,
                    fontSize: 15,
                    color: "#1f2937",
                    background: "#ffffff",
                    transition: "all 0.2s ease",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#165638"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Add payment notes or reference..."
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "2px solid #d1d5db",
              borderRadius: 10,
              fontSize: 15,
              color: "#1f2937",
              background: "#ffffff",
              fontFamily: "inherit",
              resize: "vertical",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onFocus={(e) => e.target.style.borderColor = "#165638"}
            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
          />
        </div>

        <div style={{
          display: "flex",
          gap: 12,
          paddingTop: 16,
          borderTop: "2px solid #e5e7eb"
        }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              padding: "14px 20px",
              background: submitting ? "#9ca3af" : "linear-gradient(135deg, #165638 0%, #1e7e34 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: submitting ? "none" : "0 4px 12px rgba(22, 86, 56, 0.3)",
              transform: submitting ? "none" : "translateY(0)",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
            onMouseEnter={(e) => !submitting && (e.target.style.transform = "translateY(-2px)", e.target.style.boxShadow = "0 6px 16px rgba(22, 86, 56, 0.4)")}
            onMouseLeave={(e) => !submitting && (e.target.style.transform = "translateY(0)", e.target.style.boxShadow = "0 4px 12px rgba(22, 86, 56, 0.3)")}
          >
            {submitting ? "Processing..." : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Save size={18} aria-hidden="true" />
                Save Payment
              </span>
            )}
          </button>
          {/* <button
            type="button"
            onClick={handleRazorpay}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "14px 20px",
              background: submitting ? "#9ca3af" : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: submitting ? "none" : "0 4px 12px rgba(14, 165, 233, 0.3)",
              transform: submitting ? "none" : "translateY(0)",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
            onMouseEnter={(e) => !submitting && (e.target.style.transform = "translateY(-2px)", e.target.style.boxShadow = "0 6px 16px rgba(14, 165, 233, 0.4)")}
            onMouseLeave={(e) => !submitting && (e.target.style.transform = "translateY(0)", e.target.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.3)")}
          >
            {submitting ? "Processing..." : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={18} aria-hidden="true" />
                Pay Online (Razorpay)
              </span>
            )}
          </button> */}
        </div>
      </form>
    </div>
  );
};

export default PaymentPage;