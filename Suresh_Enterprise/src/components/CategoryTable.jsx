import React, { useEffect, useState } from "react";
import { getCategories, deleteCategory, getCompanies, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import Loader from "./Loader";
import ConfirmModal from "./ConfirmModal";
import "../styles/CategoryTable.css";

const CategoryTable = ({ onEditClick, refreshTrigger, searchQuery }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [companyNameById, setCompanyNameById] = useState({});
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const isCustomer = currentUser?.userType === "Customer User";

  const fetchCategories = async () => {
    setLoading(true);
    const [response, error] = await safeApiCall(getCategories);

    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    } else {
      const all = response?.data || [];
      const filtered = isCustomer
        ? all.filter((c) => c.company_id === currentUser?.company_id)
        : all;
      setCategories(filtered);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
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

  const handleDeleteClick = (category) => {
    setDeleteModal({
      isOpen: true,
      categoryId: category.id,
      categoryName: category.name,
    });
  };

  const handleDeleteConfirm = async () => {
    const { categoryId } = deleteModal;
    setDeletingId(categoryId);
    setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" });

    const [data, error] = await safeApiCall(deleteCategory, categoryId);
    setDeletingId(null);

    if (error) {
      toast.error("Failed to delete category");
    } else {
      toast.success("Category deleted successfully!");
      fetchCategories();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" });
  };

  const handleEdit = (category) => {
    if (onEditClick) onEditClick(category);
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="category-table-wrapper">
      {loading && <Loader />}

      <table className="category-table">
        <thead>
          <tr>
            <th scope="col">Sr No</th>
            {/* <th scope="col">Category Id</th> */}
            <th scope="col">Category Name</th>
            {!isCustomer && <th scope="col">Company</th>}
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedCategories.length > 0 ? (
            paginatedCategories.map((cat, idx) => (
              <tr key={cat.id}>
                <td data-label="Sr No">{startIndex + idx + 1}</td>
                {/* <td data-label="Category Id">{cat.id}</td> */}
                <td data-label="Category Name">{cat.name}</td>
                {!isCustomer && (
                  <td data-label="Company">{companyNameById[cat.company_id] || cat.company_id}</td>
                )}
                <td data-label="Active">{cat.isActive ? "Yes" : "No"}</td>
                <td data-label="Actions">
                  <button
                    className="category-edit-button"
                    onClick={() => handleEdit(cat)}
                    aria-label={`Edit category ${cat.name}`}
                  >
                    Edit
                  </button>
                  <button
                    className="category-delete-button"
                    onClick={() => handleDeleteClick(cat)}
                    aria-label={`Delete category ${cat.name}`}
                    disabled={deletingId === cat.id}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isCustomer ? 5 : 6}>
                {searchQuery
                  ? `No categories found matching "${searchQuery}"`
                  : "No categories found"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {filteredCategories.length > 0 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredCategories.length)} of {filteredCategories.length} categories
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`pagination-button ${currentPage === page ? "active" : ""}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-button"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteModal.categoryName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default CategoryTable;
