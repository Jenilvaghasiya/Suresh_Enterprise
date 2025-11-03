import { useState } from "react";

const useProductPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditClick = (product) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setEditProduct(null);
    setShowForm(false);
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    setEditProduct(null);
  };

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDataUpdate = () => {
    triggerRefresh();
    handleFormClose();
  };

  return {
    showForm,
    editProduct,
    refreshTrigger,
    handleEditClick,
    handleFormClose,
    handleToggleForm,
    handleDataUpdate,
  };
};

export default useProductPage;
