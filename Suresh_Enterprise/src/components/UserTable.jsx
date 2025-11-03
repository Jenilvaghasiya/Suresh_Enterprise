import React, { useEffect, useState } from "react";
import { getUsers, deleteUser, getCompanies, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import Loader from "./Loader";
import ConfirmModal from "./ConfirmModal";
import "../styles/UserTable.css";

const UserTable = ({ onEditClick, refreshTrigger }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    userId: null,
    userName: "",
  });
  const [deletingId, setDeletingId] = useState(null);
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

  const fetchUsers = async () => {
    setLoading(true);
    const [response, error] = await safeApiCall(getUsers);
    if (error) {
      toast.error("Failed to fetch users");
    } else {
      const all = response?.data || [];
      const filtered = isCustomer
        ? all.filter((u) => u.company_id === currentUser?.company_id)
        : all;
      setUsers(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
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

  const handleDeleteClick = (user) => {
    setDeleteModal({ isOpen: true, userId: user.id, userName: user.name });
  };

  const handleDeleteConfirm = async () => {
    const { userId } = deleteModal;
    setDeletingId(userId);
    setDeleteModal({ isOpen: false, userId: null, userName: "" });

    const [data, error] = await safeApiCall(deleteUser, userId);
    setDeletingId(null);

    if (error) {
      toast.error("Failed to delete user");
    } else {
      toast.success("User deleted successfully!");
      fetchUsers();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, userId: null, userName: "" });
  };

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.mobile?.toLowerCase().includes(searchLower) ||
      user.userType?.toLowerCase().includes(searchLower) ||
      user.city?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <div className="user-table-wrapper">
      {loading && <Loader />}
      
      <div className="user-search-container" style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search users by name, email, mobile, user type, or city..."
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

      <table className="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Mobile</th>
            <th>User Type</th>
            <th>City</th>
            {!isCustomer && <th>Company</th>}
            <th>GST</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.length > 0 ? (
            currentUsers.map((user) => (
              <tr key={user.id}>
                <td data-label="ID">{user.id}</td>
                <td data-label="Name">{user.name}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Mobile">{user.mobile}</td>
                <td data-label="User Type">{user.userType}</td>
                <td data-label="City">{user.city}</td>
                {!isCustomer && (
                  <td data-label="Company">{companyNameById[user.company_id] || user.company_id}</td>
                )}
                <td data-label="GST">{
                  user.withGst && user.withoutGst
                    ? "With & Without GST"
                    : user.withGst
                    ? "With GST"
                    : user.withoutGst
                    ? "Without GST"
                    : "-"
                }</td>
                <td data-label="Actions">
                  <button
                    className="user-edit-button"
                    onClick={() => onEditClick(user)}
                  >
                    Edit
                  </button>
                  <button
                    className="user-delete-button"
                    onClick={() => handleDeleteClick(user)}
                    disabled={deletingId === user.id}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isCustomer ? 8 : 9}>No users found</td>
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
            Page {currentPage} of {totalPages} ({filteredUsers.length} total)
          </span>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteModal.userName}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default UserTable;
