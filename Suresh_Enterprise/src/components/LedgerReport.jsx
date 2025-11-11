import React, { useEffect, useMemo, useRef, useState } from "react";
import { safeApiCall, getCustomers, getInvoices, getPaymentsByCustomer, downloadLedgerPDF } from "../services/api";
import Loader from "./Loader";

const LedgerReport = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [payments, setPayments] = useState([]);
  const ledgerRef = useRef(null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const isCustomerUser = user?.userType === "Customer User";

  // Build full formatted bill number like in BillTable
  const formatBillNoAdmin = (invoice) => {  
    const compIdRaw = (invoice.companyProfileId ?? invoice.company_id ?? invoice.CompanyProfileId ?? "");
    const compId = String(compIdRaw).padStart(4, "0").slice(-4);
    const gstFlag = String(invoice.gst ?? "").slice(0, 1);
    const invNum = String(invoice.invoiceNumber ?? invoice.billNumber ?? "").padStart(6, "0").slice(-6);
    const year = String(invoice.billYear ?? "").padStart(4, "0").slice(-4);
    return compId + gstFlag + invNum + year;
  };

  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true);
      const [custRes] = await safeApiCall(getCustomers);
      const [invRes] = await safeApiCall(getInvoices);

      const allCustomers = custRes?.data || [];
      const scopedCustomers = isCustomerUser
        ? allCustomers.filter(c => c.company_id === user?.company_id)
        : allCustomers;
      setCustomers(scopedCustomers);

      setInvoices(invRes?.data || []);
      setLoading(false);
    };
    fetchBase();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Fetch payments when customer changes
  useEffect(() => {
    const run = async () => {
      if (!selectedCustomerId) { setPayments([]); return; }
      const [payRes] = await safeApiCall(getPaymentsByCustomer, selectedCustomerId);
      setPayments(payRes?.data || []);
    };
    run();
  }, [selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const s = search.toLowerCase();
    return customers.filter(c => (c.customerName || "").toLowerCase().includes(s));
  }, [customers, search]);

  // Build ledger rows combining invoices (debited) and payments (credited)
  const ledgerRows = useMemo(() => {
    if (!selectedCustomerId) return [];
    const custIdNum = Number(selectedCustomerId);

    const invRows = (invoices || [])
      .filter(inv => (inv.customerId || inv.customer_id) === custIdNum)
      .map(inv => ({
        date: new Date(inv.billDate || inv.createdAt || Date.now()),
        billNumber: formatBillNoAdmin(inv) || String(inv.invoiceNumber ?? inv.billNumber ?? ""),
        credited: 0,
        debited: Number(inv.totalAssesValue || inv.total || 0),
        type: "invoice"
      }));

    const payRows = (payments || []).map(p => ({
      date: new Date(p.paymentDate || p.createdAt || Date.now()),
      billNumber: (() => {
        const base = p.referenceNo || p.notes || "Payment";
        const mode = p.mode_payment || p.modeOfPayment || p.payment_mode || p.mode || p.paymentMode;
        return mode ? `${base} (${mode})` : base;
      })(),
      credited: Number(p.amount || 0),
      debited: 0,
      type: "payment"
    }));

    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const end = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    let rows = [...invRows, ...payRows];
    if (start) rows = rows.filter(r => r.date >= start);
    if (end) rows = rows.filter(r => r.date <= end);
    rows.sort((a, b) => a.date - b.date);

    let running = 0;
    return rows.map((r, idx) => {
      running += r.debited - r.credited;
      return { ...r, sr: idx + 1, total: running };
    });
  }, [invoices, payments, selectedCustomerId, fromDate, toDate]);

  if (loading) return <Loader />;

  const closingTotal = ledgerRows.length ? ledgerRows[ledgerRows.length - 1].total : 0;
  const openingTotal = 0;

  const handleExportPDF = async () => {
    try {
      if (!selectedCustomerId) return;
      const response = await downloadLedgerPDF({
        customerId: Number(selectedCustomerId),
        companyProfileId: undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const custName = customers.find(c => String(c.id) === String(selectedCustomerId))?.customerName || "Ledger";
      a.href = url;
      a.download = `Ledger_${custName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("PDF export failed", e);
    }
  };

  const handleExportCSV = () => {
    // Build CSV rows
    const header = ["Sr No","Bill Number / Ref","Credited","Debited","Total"];
    const rows = ledgerRows.map(r => [r.sr, r.billNumber || "-", r.credited, r.debited, r.total]);
    // Append summary line
    rows.push([]);
    rows.push(["","","","Closing Balance", closingTotal]);
    const csv = [header, ...rows]
      .map(cols => cols.map(v => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const custName = customers.find(c => String(c.id) === String(selectedCustomerId))?.customerName || "All";
    a.href = url;
    a.download = `Ledger_${custName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bill-table-container">
      <div className="filter-section">
        <h1 className="filter-title">Ledger Report</h1>
        <div className="filters-grid">
          {/* Single searchable dropdown */}
          <div ref={dropdownRef} className="dropdown" data-dropdown>
            <label className="form-label">Select Customer</label>
            <div className="dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedCustomerId
                  ? (customers.find(c => String(c.id) === String(selectedCustomerId))?.customerName || "")
                  : "Search and select customer"}
              </span>
              <span className="dropdown-caret">▼</span>
            </div>
            {/* Date Range */}
            <div className="filters-grid" style={{ marginTop: "0.75rem", gap: "0.75rem" }}>
              <div>
                <label className="form-label">From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
      {/* Export Buttons */}
      <div className="filters-grid" style={{ marginTop: "0.75rem" }}>
        <button className="btn btn-primary" onClick={handleExportPDF}>Generate PDF</button>
        <button className="btn btn-secondary" onClick={handleExportCSV}>Export Excel</button>
      </div>
            {isOpen && (
              <div className="dropdown-menu-custom">
                <div className="dropdown-search">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredCustomers.length ? (
                  filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="dropdown-item"
                      onClick={() => { setSelectedCustomerId(String(c.id)); setIsOpen(false); }}
                    >
                      {c.customerName}
                    </div>
                  ))
                ) : (
                  <div className="dropdown-empty">No customers found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bill-table-div" ref={ledgerRef}>
        <div
          className="ledger-summary"
          style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "0.75rem" }}
        >
          <div>
            <strong>Opening Balance:</strong>
            <span style={{ marginLeft: "0.5rem" }}>₹{openingTotal.toFixed(2)}</span>
          </div>
        </div>
        <table className="bill-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Bill Number / Ref</th>
              <th>Credited</th>
              <th>Debited</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.length ? ledgerRows.map(row => (
              <tr key={`${row.type}-${row.sr}-${row.billNumber}`}>
                <td data-label="Sr No">{row.sr}</td>
                <td data-label="Bill Number / Ref">{row.billNumber || "-"}</td>
                <td data-label="Credited">₹{row.credited.toFixed(2)}</td>
                <td data-label="Debited">₹{row.debited.toFixed(2)}</td>
                <td data-label="Total">₹{row.total.toFixed(2)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>No data</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: "right" }}><strong>Closing Balance:</strong></td>
              <td>₹{closingTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default LedgerReport;
