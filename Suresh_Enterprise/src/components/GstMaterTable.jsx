import React, { useEffect, useState } from "react";
import { getGstMasters, deleteGstMaster, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import Loader from "./Loader";
import ConfirmModal from "./ConfirmModal";
import "../styles/GstMasterTable.css";

const GstMasterTable = ({ onEditClick, refreshTrigger }) => {
  const [gstRates, setGstRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    gstId: null,
    gstRate: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchGstRates = async () => {
    setLoading(true);
    const [response, error] = await safeApiCall(getGstMasters);

    if (error) {
      toast.error("Failed to fetch GST rates");
    } else {
      setGstRates(response?.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGstRates();
  }, [refreshTrigger]);

  const handleDeleteClick = (gst) => {
    setDeleteModal({
      isOpen: true,
      gstId: gst.id,
      gstRate: `${gst.gstRate}%`,
    });
  };

  const handleDeleteConfirm = async () => {
    const { gstId } = deleteModal;
    setDeleteModal({ isOpen: false, gstId: null, gstRate: "" });

    const [data, error] = await safeApiCall(deleteGstMaster, gstId);

    if (error) {
      toast.error("Failed to delete GST rate");
    } else {
      toast.success("GST Rate deleted successfully!");
      fetchGstRates();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, gstId: null, gstRate: "" });
  };

  const handleEdit = (gst) => {
    if (onEditClick) onEditClick(gst);
  };

  // Filter GST rates based on search term
  const filteredGstRates = gstRates.filter((gst) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      gst.gstRate?.toString().includes(searchLower) ||
      gst.sgstRate?.toString().includes(searchLower) ||
      gst.cgstRate?.toString().includes(searchLower) ||
      gst.igstRate?.toString().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGstRates = filteredGstRates.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGstRates.length / itemsPerPage);

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
      <div className="gst-search-container" style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search GST rates by GST, SGST, CGST, or IGST rate..."
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

      <div className="gst-master-table-container">
        <table className="gst-master-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>GST Rate</th>
              <th>SGST Rate</th>
              <th>CGST Rate</th>
              <th>IGST Rate</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentGstRates.length > 0 ? (
              currentGstRates.map((gst) => (
                <tr key={gst.id}>
                  <td data-label="ID">{gst.id}</td>
                  <td data-label="GST Rate">{gst.gstRate}%</td>
                  <td data-label="SGST Rate">{gst.sgstRate}%</td>
                  <td data-label="CGST Rate">{gst.cgstRate}%</td>
                  <td data-label="IGST Rate">{gst.igstRate}%</td>
                  <td data-label="Active">{gst.isActive ? "Yes" : "No"}</td>
                  <td data-label="Actions">
                    <button
                      className="gst-edit-button"
                      onClick={() => handleEdit(gst)}
                    >
                      Edit
                    </button>
                    <button
                      className="gst-delete-button"
                      onClick={() => handleDeleteClick(gst)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>
                  No GST Rates Available
                </td>
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
            Page {currentPage} of {totalPages} ({filteredGstRates.length} total)
          </span>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete GST Rate"
        message={`Are you sure you want to delete GST Rate "${deleteModal.gstRate}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};

export default GstMasterTable;
