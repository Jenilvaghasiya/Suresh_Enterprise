import React, { useEffect, useState, useRef } from "react";
import {
  getInvoices,
  getInvoicesByUserId,
  getProducts,
  getCustomers,
  getCompanies,
  safeApiCall,
  downloadInvoicePDF,
  downloadBillReportPDF,
} from "../services/api";
import { toast } from "../utils/toast";
import Loader from "./Loader";
import BillView from "./BillView";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../styles/BillTable.css";

const BillTable = ({ refreshTrigger, onEdit }) => {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [currentCopyType, setCurrentCopyType] = useState("Original");
  const billRef = useRef();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      return userData;
    } catch {
      return null;
    }
  });

  // Filter states
  const todayStr = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: todayStr,
    endDate: todayStr,
    customers: []
  });
  const dropdownRef = useRef(null);

  // Get user data from localStorage
  const getUserData = () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      return userData;
    } catch {
      return null;
    }
  };

  // Download consolidated report PDF
  const handleDownloadReport = async () => {
    try {
      toast.info("Generating report PDF...");
      const response = await downloadBillReportPDF({
        fromDate: appliedFilters.startDate || undefined,
        toDate: appliedFilters.endDate || undefined,
        customerIds: appliedFilters.customers || [],
        status: undefined,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const from = appliedFilters.startDate ? new Date(appliedFilters.startDate).toLocaleDateString('en-GB') : 'ALL';
      const to = appliedFilters.endDate ? new Date(appliedFilters.endDate).toLocaleDateString('en-GB') : 'ALL';
      link.download = `Bill_Report_${from}_to_${to}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Report generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report PDF");
    }
  };

  // API call to get all invoices (for Admin) using axios helper (sends credentials)
  const getAllInvoices = async () => {
    return await safeApiCall(getInvoices);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const userData = getUserData();
      
      if (!userData) {
        toast.error("User data not found. Please log in again.");
        setLoading(false);
        return;
      }

      // Check if user is Admin
      const isAdmin = userData.userType === "Admin User";
      
      let invoicesRes, invoicesError;
      
      if (isAdmin) {
        // Fetch all invoices for Admin users
        console.log("Fetching all invoices for Admin User");
        [invoicesRes, invoicesError] = await getAllInvoices();
      } else {
        // Fetch invoices by user ID for regular users
        console.log("Fetching invoices for user ID:", userData.id);
        [invoicesRes, invoicesError] = await safeApiCall(getInvoicesByUserId, userData.id);
      }
      
      const [productsRes, productsError] = await safeApiCall(getProducts);
      const [customersRes, customersError] = await safeApiCall(getCustomers);
      const [companiesRes, companiesError] = await safeApiCall(getCompanies);

      if (invoicesError) {
        toast.error("Failed to fetch invoices");
      } else {
        setInvoices(invoicesRes?.data || []);
      }

      if (!productsError) {
        setProducts(productsRes?.data || []);
      }
      if (!customersError) {
        const allCustomers = customersRes?.data || [];
        const scopedCustomers = (userData?.userType === "Customer User")
          ? allCustomers.filter((c) => c.company_id === userData?.company_id)
          : allCustomers;
        setCustomers(scopedCustomers);
      }
      if (!companiesError) {
        setCompanies(companiesRes?.data || []);
      }

      setLoading(false);
    };
    fetchData();
  }, [refreshTrigger]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Get totals for display (prefer backend values, fallback to calculation)
  const getInvoiceTotals = (invoice) => {
    // If backend has the values, use them
    if (
      invoice.totalAssesValue &&
      invoice.sgstAmount &&
      invoice.cgstAmount &&
      invoice.igstAmount
    ) {
      return {
        totalAssesValue: parseFloat(invoice.totalAssesValue).toFixed(2),
        sgstAmount: parseFloat(invoice.sgstAmount).toFixed(2),
        cgstAmount: parseFloat(invoice.cgstAmount).toFixed(2),
        igstAmount: parseFloat(invoice.igstAmount).toFixed(2),
      };
    }

    // Fallback: Calculate from items if backend values are missing
    const items = invoice.invoiceItems || [];
    const totalAssesValue = items.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );

    const gstRate = invoice.gstRate || invoice.GstMaster?.gstRate || 18;
    const taxAmount = (totalAssesValue * gstRate) / 100;

    return {
      totalAssesValue: totalAssesValue.toFixed(2),
      sgstAmount: (taxAmount / 2).toFixed(2),
      cgstAmount: (taxAmount / 2).toFixed(2),
      igstAmount: taxAmount.toFixed(2),
    };
  };

  // Build full formatted bill number like in BillView
  const formatBillNoAdmin = (invoice) => {
    const company = companies.find(
      (c) => c.id === (invoice.companyProfileId ?? invoice.company_id ?? invoice.CompanyProfileId)
    );
    const compId = String(company?.id || "").padStart(4, "0").slice(-4);
    const gstFlag = String(invoice.gst).slice(0, 1);
    const invNum = String(invoice.invoiceNumber || "").padStart(6, "0").slice(-6);
    const year = String(invoice.billYear || "").padStart(4, "0").slice(-4);
    return compId + gstFlag + invNum + year;
  };

  const handleGenerateBill = async (invoice, copyType) => {
  try {
    toast.info(`Generating ${copyType} PDF...`);
    
    // Call the server-side PDF generation API
    const response = await downloadInvoicePDF(invoice.id, copyType);
    
    // Create a blob from the response
    const blob = new Blob([response.data], { type: 'application/pdf' });
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const formattedNo = formatBillNoAdmin(invoice);
    link.download = `Invoice_${formattedNo}_${copyType}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(`${copyType} bill generated successfully!`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error(`Failed to generate ${copyType} PDF. Please try again.`);
  }
};

  // Handle customer selection
  const handleCustomerToggle = (customerId) => {
    if (customerId === "all") {
      if (selectedCustomers.length === customers.length) {
        setSelectedCustomers([]);
      } else {
        setSelectedCustomers(customers.map(c => c.id));
      }
    } else {
      setSelectedCustomers(prev => {
        if (prev.includes(customerId)) {
          return prev.filter(id => id !== customerId);
        } else {
          return [...prev, customerId];
        }
      });
    }
  };

  // Apply filters
  const handleGenerateReport = () => {
    setAppliedFilters({
      startDate,
      endDate,
      customers: selectedCustomers
    });
    setCurrentPage(1);
    toast.success("Filters applied successfully!");
  };

  // Clear filters
  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedCustomers([]);
    setAppliedFilters({
      startDate: "",
      endDate: "",
      customers: []
    });
    setCurrentPage(1);
    toast.info("Filters cleared");
  };

  // Filter invoices based on search term and applied filters
  const filteredInvoices = invoices.filter((invoice) => {
    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    const formattedNo = formatBillNoAdmin(invoice);
    const matchesSearch = 
      String(invoice.billNumber ?? "").toLowerCase().includes(searchLower) ||
      formattedNo.toLowerCase().includes(searchLower) ||
      invoice.Customer?.customerName?.toLowerCase().includes(searchLower) ||
      invoice.CompanyProfile?.companyName?.toLowerCase().includes(searchLower) ||
      invoice.deliveryAt?.toLowerCase().includes(searchLower) ||
      invoice.transport?.toLowerCase().includes(searchLower) ||
      invoice.lrNumber?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Date filter
    if (appliedFilters.startDate || appliedFilters.endDate) {
      const billDate = new Date(invoice.billDate);
      if (appliedFilters.startDate) {
        const start = new Date(appliedFilters.startDate);
        start.setHours(0, 0, 0, 0);
        if (billDate < start) return false;
      }
      if (appliedFilters.endDate) {
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        if (billDate > end) return false;
      }
    }

    // Customer filter
    if (appliedFilters.customers.length > 0) {
      const customerId = invoice.customerId || invoice.customer_id || invoice.Customer?.id;
      if (!appliedFilters.customers.includes(customerId)) return false;
    }

    return true;
  });

  // Filter customers based on search term in dropdown
  const filteredCustomersForDropdown = customers.filter(customer =>
    customer.customerName?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const isAdmin = currentUser?.userType === "Admin User";
  const showCompanyColumn = isAdmin;

  if (loading) return <Loader />;

  return (
    <div className="bill-table-container">
      {/* Filter Section */}
      <div className="filter-section">
        <h4 className="filter-title">Filter Invoices</h4>
        
        <div className="filters-grid">
          {/* Start Date */}
          <div>
            <label className="form-label">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="form-label">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Customer Dropdown */}
          <div ref={dropdownRef} className="dropdown" data-dropdown>
            <label className="form-label">
              Select Customers
            </label>
            <div className="dropdown-toggle" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedCustomers.length === 0
                  ? "Select customers..."
                  : selectedCustomers.length === customers.length
                  ? "All Customers Selected"
                  : `${selectedCustomers.length} customer(s) selected`}
              </span>
              <span className="dropdown-caret">▼</span>
            </div>

            {isDropdownOpen && (
              <div className="dropdown-menu-custom">
                {/* Search box */}
                <div className="dropdown-search">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Select All option */}
                <div className="dropdown-item select-all" onClick={(e) => { e.stopPropagation(); handleCustomerToggle("all"); }}>
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === customers.length}
                    onChange={() => {}}
                  />
                  Select All Customers
                </div>

                {/* Customer list */}
                {filteredCustomersForDropdown.length > 0 ? (
                  filteredCustomersForDropdown.map(customer => (
                    <div className="dropdown-item" key={customer.id} onClick={(e) => { e.stopPropagation(); handleCustomerToggle(customer.id); }}>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => {}}
                      />
                      {customer.customerName}
                    </div>
                  ))
                ) : (
                  <div className="dropdown-empty">
                    No customers found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Button */}
          <button onClick={handleGenerateReport} className="btn btn-primary">Search</button>

          {/* Generate Report Button */}
          <button onClick={handleDownloadReport} className="btn btn-primary">Generate Report</button>

          {/* Clear Filters Button */}
          <button onClick={handleClearFilters} className="btn btn-secondary">Clear Filters</button>
        </div>

        {/* Active filters display */}
        {(appliedFilters.startDate || appliedFilters.endDate || appliedFilters.customers.length > 0) && (
          <div className="active-filters">
            <strong>Active Filters:</strong>
            {appliedFilters.startDate && <span style={{ marginLeft: "10px" }}>Start: {new Date(appliedFilters.startDate).toLocaleDateString("en-GB")}</span>}
            {appliedFilters.endDate && <span style={{ marginLeft: "10px" }}>End: {new Date(appliedFilters.endDate).toLocaleDateString("en-GB")}</span>}
            {appliedFilters.customers.length > 0 && (
              <span style={{ marginLeft: "10px" }}>
                Customers: {appliedFilters.customers.length === customers.length ? "All" : appliedFilters.customers.length}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search Box */}
      <div className="bill-search-container" style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search invoices by invoice number, customer, company, delivery, transport, or LR number..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />
      </div>

      <div className="bill-table-div">
        <h3>
          Invoices 
          {currentUser?.userType === "Admin User" && (
            <span style={{ fontSize: "14px", color: "#666", marginLeft: "10px" }}>
              (Showing all invoices)
            </span>
          )}
        </h3>
        <table className="bill-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Invoice Number</th>
              <th>Customer Name</th>
              {showCompanyColumn && <th>Company Name</th>}
              <th>Bill Date</th>
              <th>Deliver At</th>
              <th>Transport</th>
              <th>Lr Number</th>
              <th>TotalAssesValue</th>
              <th>sgstAmount</th>
              <th>cgstAmount</th>
              <th>igstAmount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentInvoices.length > 0 ? (
              currentInvoices.map((invoice, idx) => {
                const totals = getInvoiceTotals(invoice);
                const serial = indexOfFirstItem + idx + 1;
                return (
                  <tr key={invoice.id}>
                    <td data-label="Sr No">{serial}</td>
                    <td data-label="Invoice No">{formatBillNoAdmin(invoice)}</td>
                    <td data-label="Customer">{invoice.Customer?.customerName || "N/A"}</td>
                    {showCompanyColumn && (
                      <td data-label="Company">{invoice.CompanyProfile?.companyName || "N/A"}</td>
                    )}
                    <td data-label="Bill Date">
                      {invoice.billDate
                        ? new Date(invoice.billDate).toLocaleDateString("en-GB")
                        : "N/A"}
                    </td>
                    <td data-label="Delivery At">{invoice.deliveryAt || "N/A"}</td>
                    <td data-label="Transport">{invoice.transport || "N/A"}</td>
                    <td data-label="LR No">{invoice.lrNumber || "N/A"}</td>
                    <td data-label="Total Asses. Value">₹{totals.totalAssesValue}</td>
                    <td data-label="SGST">₹{totals.sgstAmount}</td>
                    <td data-label="CGST">₹{totals.cgstAmount}</td>
                    <td data-label="IGST">₹{totals.igstAmount}</td>
                    <td data-label="Status">{invoice.isActive ? "Active" : "Inactive"}</td>
                    <td data-label="Actions" className="action-buttons">
                      <button
                        className="bill-generate-btn"
                        onClick={() => onEdit && onEdit(invoice)}
                        style={{ background: "#6b7280", color: "#fff" }}
                      >
                        Edit
                      </button>
                      <button
                        className="bill-generate-btn original-btn"
                        onClick={() => handleGenerateBill(invoice, "Original")}
                      >
                        Original
                      </button>
                      <button
                        className="bill-generate-btn duplicate-btn"
                        onClick={() => handleGenerateBill(invoice, "Duplicate")}
                      >
                        Duplicate
                      </button>
                      <button
                        className="bill-generate-btn triplicate-btn"
                        onClick={() =>
                          handleGenerateBill(
                            invoice,
                            "Triplicate For Suppliers"
                          )
                        }
                      >
                        Triplicate
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={showCompanyColumn ? 14 : 13}>No invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-container" style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          marginTop: "20px",
          gap: "10px"
        }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fff",
            }}
          >
            Previous
          </button>
          
          <div style={{ display: "flex", gap: "5px" }}>
            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      background: currentPage === pageNumber ? "#007bff" : "#fff",
                      color: currentPage === pageNumber ? "#fff" : "#000",
                      fontWeight: currentPage === pageNumber ? "bold" : "normal",
                    }}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (
                pageNumber === currentPage - 2 ||
                pageNumber === currentPage + 2
              ) {
                return <span key={pageNumber}>...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: "8px 12px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fff",
            }}
          >
            Next
          </button>

          <span style={{ marginLeft: "10px", fontSize: "14px" }}>
            Page {currentPage} of {totalPages} ({filteredInvoices.length} total)
          </span>
        </div>
      )}

      {/* Hidden BillView for PDF generation */}
      <div style={{ position: "absolute", left: "-9999px" }}>
        <BillView
          ref={billRef}
          invoice={selectedInvoice}
          products={products}
          customers={customers}
          companies={companies}
          copyType={currentCopyType}
        />
      </div>
    </div>
  );
};

export default BillTable;