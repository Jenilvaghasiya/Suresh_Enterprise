import React, { useEffect, useState } from "react";
import "../styles/CustomerTable.css";
import { getCustomers, deleteCustomer, getCompanies, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import Loader from "./Loader";
import ConfirmModal from "./ConfirmModal";

const CustomerTable = ({ onEditClick, refreshTrigger }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    customerId: null,
    customerName: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [companyNameById, setCompanyNameById] = useState({});
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const isCustomer = currentUser?.userType === "Customer User";

  const fetchCustomers = async () => {
    setLoading(true);
    const [response, error] = await safeApiCall(getCustomers);

    if (error) {
      toast.error("Failed to fetch customers");
    } else {
      const all = response?.data || [];
      const filtered = isCustomer
        ? all.filter((cust) => cust.company_id === currentUser?.company_id)
        : all;
      setCustomers(filtered);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [refreshTrigger]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const [res, err] = await safeApiCall(getCompanies);
      if (!err) {
        const list = res?.data || [];
        const scoped = isCustomer ? list.filter((c) => c.id === currentUser?.company_id) : list;
        const map = {};
        scoped.forEach((c) => {
          map[c.id] = c.companyName || c.name || c.id;
        });
        setCompanyNameById(map);
      }
    };
    fetchCompanies();
  }, []);

  const handleDeleteClick = (customer) => {
    setDeleteModal({
      isOpen: true,
      customerId: customer.id,
      customerName: customer.customerName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { customerId } = deleteModal;
    setDeleteModal({ isOpen: false, customerId: null, customerName: "" });

    const [data, error] = await safeApiCall(deleteCustomer, customerId);

    if (error) {
      toast.error("Failed to delete customer");
    } else {
      toast.success("Customer deleted successfully!");
      fetchCustomers();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, customerId: null, customerName: "" });
  };

  const handleEdit = (customer) => {
    if (onEditClick) onEditClick(customer);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.customerName?.toLowerCase().includes(searchLower) ||
      customer.gstNumber?.toLowerCase().includes(searchLower) ||
      customer.contactNumber?.toLowerCase().includes(searchLower) ||
      customer.emailAddress?.toLowerCase().includes(searchLower) ||
      customer.billingAddress?.toLowerCase().includes(searchLower) ||
      customer.shippingAddress?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="customer-search-container" style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search customers by name, GST, contact, email, or address..."
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

      <table className="customer-table">
        <thead>
          <tr>
            <th>Sr No</th>
            <th>Name</th>
            <th>GST No.</th>
            <th>Contact No.</th>
            <th>Email Address</th>
            <th>Billing Address</th>
            <th>Shipping Address</th>
            <th>Opening Balance</th>
            <th>Opening Date</th>
            {!isCustomer && <th>Company</th>}
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentCustomers.length > 0 ? (
            currentCustomers.map((cust, idx) => (
              <tr key={cust.id}>
                <td data-label="Sr No">{indexOfFirstItem + idx + 1}</td>
                <td data-label="Name">{cust.customerName}</td>
                <td data-label="GST No.">{cust.gstNumber || "-"}</td>
                <td data-label="Contact No.">{cust.contactNumber}</td>
                <td data-label="Email Address">{cust.emailAddress || "-"}</td>
                <td data-label="Billing Address">{cust.billingAddress || "-"}</td>
                <td data-label="Shipping Address">{cust.shippingAddress || "-"}</td>
                <td data-label="Opening Balance">₹{Number(cust.openingBalance || 0).toFixed(2)}</td>
                <td data-label="Opening Date">{formatDate(cust.openingDate)}</td>
                {!isCustomer && (
                  <td data-label="Company">{companyNameById[cust.company_id] || cust.company_id}</td>
                )}
                <td data-label="Active">{cust.isActive ? "Yes" : "No"}</td>
                <td data-label="Actions">
                  <button
                    className="customer-edit-button"
                    onClick={() => handleEdit(cust)}
                  >
                    Edit
                  </button>
                  <button
                    className="customer-delete-button"
                    onClick={() => handleDeleteClick(cust)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isCustomer ? 11 : 12}>No customers found</td>
            </tr>
          )}
        </tbody>
      </table>

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
              // Show first page, last page, current page, and pages around current
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
            Page {currentPage} of {totalPages} ({filteredCustomers.length} total)
          </span>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteModal.customerName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};

export default CustomerTable;
