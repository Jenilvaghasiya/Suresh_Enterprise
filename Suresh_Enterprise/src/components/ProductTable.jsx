import React, { useEffect, useState } from "react";
import { getProducts, deleteProduct, getCompanies, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import Loader from "./Loader";
import ConfirmModal from "./ConfirmModal";
import "../styles/ProductTable.css";

const ProductTable = ({ onEditClick, refreshTrigger }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    productId: null,
    productName: "",
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

  const fetchProducts = async () => {
    setLoading(true);
    const [response, error] = await safeApiCall(getProducts);

    if (error) {
      toast.error("Failed to fetch products");
    } else {
      const all = response?.data || [];
      const filtered = isCustomer
        ? all.filter((p) => p.company_id === currentUser?.company_id)
        : all;
      setProducts(filtered);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
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

  const handleDeleteClick = (product) => {
    setDeleteModal({
      isOpen: true,
      productId: product.id,
      productName: product.productName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { productId } = deleteModal;
    setDeleteModal({ isOpen: false, productId: null, productName: "" });

    const [data, error] = await safeApiCall(deleteProduct, productId);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted successfully!");
      fetchProducts();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, productId: null, productName: "" });
  };

  const handleEdit = (product) => {
    if (onEditClick) onEditClick(product);
  };

  // Filter products based on search term
  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.productName?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.hsnCode?.toLowerCase().includes(searchLower) ||
      product.uom?.toLowerCase().includes(searchLower) ||
      product.Category?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

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
      <div className="product-search-container" style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search products by name, description, HSN code, UOM, or category..."
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

      <table className="product-table">
        <thead>
          <tr>
            <th>Sr No</th>
            <th>Name</th>
            <th>Description</th>
            <th>HSN Code</th>
            <th>UOM</th>
            <th>Price</th>
            <th>Category</th>
            {!isCustomer && <th>Company</th>}
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentProducts.length > 0 ? (
            currentProducts.map((prod, idx) => (
              <tr key={prod.id}>
                <td data-label="Sr No">{indexOfFirstItem + idx + 1}</td>
                <td data-label="Name">{prod.productName}</td>
                <td data-label="Description">{prod.description}</td>
                <td data-label="HSN Code">{prod.hsnCode || "-"}</td>
                <td data-label="UOM">{prod.uom}</td>
                <td data-label="Price">₹{Number(prod.price).toFixed(2)}</td>
                <td data-label="Category">{prod.Category?.name || "-"}</td>
                {!isCustomer && (
                  <td data-label="Company">{companyNameById[prod.company_id] || prod.company_id}</td>
                )}
                <td data-label="Status">{prod.isActive ? "Active" : "Inactive"}</td>
                <td data-label="Actions">
                  <button
                    className="product-edit-button"
                    onClick={() => handleEdit(prod)}
                  >
                    Edit
                  </button>
                  <button
                    className="product-delete-button"
                    onClick={() => handleDeleteClick(prod)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isCustomer ? 9 : 10} style={{ textAlign: "center" }}>
                No products available
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
            Page {currentPage} of {totalPages} ({filteredProducts.length} total)
          </span>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteModal.productName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};

export default ProductTable;
