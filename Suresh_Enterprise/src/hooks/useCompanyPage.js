import { useState } from "react";

const useCompanyPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditClick = (company) => {
    setEditCompany(company);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setEditCompany(null);
    setShowForm(false);
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    setEditCompany(null);
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
    editCompany,
    refreshTrigger,
    handleEditClick,
    handleFormClose,
    handleToggleForm,
    handleDataUpdate,
  };
};

export default useCompanyPage;
