import React, { useEffect, useState, useRef } from "react";
import {
  getInvoicesByUserId,
  getProducts,
  getCustomers,
  getCompanies,
  safeApiCall,
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

  // Get user data from localStorage
  const getUserData = () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      return userData;
    } catch {
      return null;
    }
  };

  // API call to get all invoices (for Admin)
  const getAllInvoices = async () => {
    try {
      const response = await fetch("https://suresh-enterprice-app.onrender.com/api/invoices");
      if (!response.ok) {
        throw new Error("Failed to fetch all invoices");
      }
      const data = await response.json();
      return [data, null];
    } catch (error) {
      return [null, error];
    }
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
        setCustomers(customersRes?.data || []);
      }
      if (!companiesError) {
        setCompanies(companiesRes?.data || []);
      }

      setLoading(false);
    };
    fetchData();
  }, [refreshTrigger]);
  
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
    setSelectedInvoice(invoice);
    setCurrentCopyType(copyType);

    setTimeout(async () => {
      if (billRef.current) {
        try {
          const canvas = await html2canvas(billRef.current, { scale: 2 });
          const imgData = canvas.toDataURL("image/png");

          const pdf = new jsPDF("p", "mm", "a4");
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          const formattedNo = formatBillNoAdmin(invoice);
          pdf.save(`Invoice_${formattedNo}_${copyType}.pdf`);

          toast.success(`${copyType} bill generated successfully!`);

          setSelectedInvoice(null);
          setCurrentCopyType("Original");
        } catch (error) {
          console.error("Error generating PDF:", error);
          toast.error("Failed to generate PDF");
        }
      }
    }, 300);
  };

  // Filter invoices based on search term
  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    const formattedNo = formatBillNoAdmin(invoice);
    return (
      String(invoice.billNumber ?? "").toLowerCase().includes(searchLower) ||
      formattedNo.toLowerCase().includes(searchLower) ||
      invoice.Customer?.customerName?.toLowerCase().includes(searchLower) ||
      invoice.CompanyProfile?.companyName?.toLowerCase().includes(searchLower) ||
      invoice.deliveryAt?.toLowerCase().includes(searchLower) ||
      invoice.transport?.toLowerCase().includes(searchLower) ||
      invoice.lrNumber?.toLowerCase().includes(searchLower)
    );
  });

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

  if (loading) return <Loader />;

  return (
    <div className="bill-table-container">
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
              <th>Sr_No</th>
              <th>Invoice_Number</th>
              <th>Customer_Name</th>
              <th>Company_Name</th>
              <th>Bill_Date</th>
              <th>Deliver_At</th>
              <th>Transport</th>
              <th>Lr_Number</th>
              <th>TotalAssesValue</th>
              <th>sgstAmount</th>
              <th>cgstAmount</th>
              <th>igstAmount</th>
              <th>isActive</th>
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
                    <td data-label="Company">{invoice.CompanyProfile?.companyName || "N/A"}</td>
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
                    <td data-label="Active">{invoice.isActive ? "Yes" : "No"}</td>
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
                <td colSpan={14}>No invoices found.</td>
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