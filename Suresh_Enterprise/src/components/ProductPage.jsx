import React from "react";
import "../styles/ProductPage.css";
import ProductForm from "../components/ProductForm";
import ProductTable from "../components/ProductTable";
import useProductPage from "../hooks/useProductPage";

const ProductPage = () => {
  const {
    showForm,
    editProduct,
    refreshTrigger,
    handleEditClick,
    handleToggleForm,
    handleDataUpdate,
  } = useProductPage();

  return (
    <div className="product-page-container">
      <div className="product-page-header">
        <h2>Products Management</h2>
        <button className="product-toggle-button" onClick={handleToggleForm}>
          {showForm ? "View Products" : "Add Products"}
        </button>
      </div>

      <div className="product-body">
        {showForm ? (
          <ProductForm
            editProduct={editProduct}
            onDataUpdate={handleDataUpdate}
          />
        ) : (
          <ProductTable
            onEditClick={handleEditClick}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
};

export default ProductPage;
