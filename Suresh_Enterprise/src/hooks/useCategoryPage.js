import { useState } from "react";

const useCategoryPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditClick = (category) => {
    setEditCategory(category);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setEditCategory(null);
    setShowForm(false);
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    setEditCategory(null);
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
    editCategory,
    refreshTrigger,
    handleEditClick,
    handleFormClose,
    handleToggleForm,
    handleDataUpdate,
  };
};

export default useCategoryPage;
