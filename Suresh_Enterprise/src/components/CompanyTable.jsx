import React, { useEffect, useState } from "react";
import "../styles/CompanyTable.css";
import {
  getCompanies,
  deleteCompany,
  getGstMasters,
  fileUrl,
  safeApiCall,
} from "../services/api";
import { toast } from "../utils/toast";
import Loader from "./Loader";
import ConfirmModal from "./ConfirmModal";

const CompanyTable = ({ onEditClick, refreshTrigger }) => {
  const [companies, setCompanies] = useState([]);
  const [gstMasters, setGstMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    companyId: null,
    companyName: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const isCustomer = currentUser?.userType === "Customer User";

  const fetchCompanies = async () => {
    setLoading(true);

    // Fetch both companies and GST masters
    const [companiesResponse, companiesError] = await safeApiCall(getCompanies);
    const [gstResponse, gstError] = await safeApiCall(getGstMasters);

    if (companiesError) {
      toast.error("Failed to fetch companies");
    } else {
      const list = companiesResponse?.data || [];
      const filtered = isCustomer
        ? list.filter((c) => c.id === currentUser?.company_id)
        : list;
      setCompanies(filtered);
    }

    if (!gstError) {
      setGstMasters(gstResponse?.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, [refreshTrigger]);

  // Helper function to get GST rate by gstMasterId
  const getGstRate = (gstMasterId) => {
    const gstMaster = gstMasters.find((g) => g.id === gstMasterId);
    return gstMaster?.gstRate || null;
  };

  const handleDeleteClick = (company) => {
    setDeleteModal({
      isOpen: true,
      companyId: company.id,
      companyName: company.companyName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { companyId } = deleteModal;
    setDeleteModal({ isOpen: false, companyId: null, companyName: "" });

    const [data, error] = await safeApiCall(deleteCompany, companyId);

    if (error) {
      toast.error("Failed to delete company");
    } else {
      toast.success("Company deleted successfully!");
      fetchCompanies();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, companyId: null, companyName: "" });
  };

  const handleEdit = (company) => {
    if (onEditClick) onEditClick(company);
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter((company) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      company.companyName?.toLowerCase().includes(searchLower) ||
      company.companyAddress?.toLowerCase().includes(searchLower) ||
      company.companyGstNumber?.toLowerCase().includes(searchLower) ||
      company.city?.toLowerCase().includes(searchLower) ||
      company.state?.toLowerCase().includes(searchLower) ||
      company.country?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading) return <Loader />;

  return (
    <>
      {!isCustomer && (
        <div className="company-search-container" style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Search companies by name, address, GST, city, state, or country..."
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
      )}

      <table className="company-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Logo</th>
            <th>Name</th>
            <th>Address</th>
            <th>GST No.</th>
            <th>Account No.</th>
            <th>Account Holder</th>
            <th>IFSC Code</th>
            <th>Branch Name</th>
            <th>City</th>
            <th>State</th>
            <th>Country</th>
            <th>GST Rate</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentCompanies.length > 0 ? (
            currentCompanies.map((c) => (
              <tr key={c.id}>
                <td data-label="ID">{c.id}</td>
                <td data-label="Logo">
                  {c.companyLogo ? (
                    <img
                      src={fileUrl(c.companyLogo)}
                      alt={c.companyName}
                      style={{
                        width: "50px",
                        height: "50px",
                        objectFit: "contain",
                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    <span style={{ color: "#999" }}>No Logo</span>
                  )}
                </td>
                <td data-label="Name">{c.companyName}</td>
                <td data-label="Address">{c.companyAddress}</td>
                <td data-label="GST No.">{c.companyGstNumber || "-"}</td>
                <td data-label="Account No.">{c.companyAccountNumber}</td>
                <td data-label="Account Holder">{c.accountHolderName}</td>
                <td data-label="IFSC Code">{c.ifscCode}</td>
                <td data-label="Branch Name">{c.branchName}</td>
                <td data-label="City">{c.city}</td>
                <td data-label="State">{c.state}</td>
                <td data-label="Country">{c.country}</td>
                <td data-label="GST Rate">
                  {getGstRate(c.gstMasterId)
                    ? `${getGstRate(c.gstMasterId)}%`
                    : "-"}
                </td>
                <td data-label="Active">{c.isActive ? "Yes" : "No"}</td>
                <td data-label="Actions">
                  <button
                    className="company-edit-button"
                    onClick={() => handleEdit(c)}
                  >
                    Edit
                  </button>
                  {!isCustomer && (
                    <button
                      className="company-delete-button"
                      onClick={() => handleDeleteClick(c)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="15" style={{ textAlign: "center" }}>
                No companies found
              </td>
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
            Page {currentPage} of {totalPages} ({filteredCompanies.length} total)
          </span>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Company"
        message={`Are you sure you want to delete "${deleteModal.companyName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};

export default CompanyTable;
