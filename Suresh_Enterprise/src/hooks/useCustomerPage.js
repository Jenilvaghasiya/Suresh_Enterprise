import { useState } from "react";

const useCustomerPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditClick = (customer) => {
    setEditCustomer(customer);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setEditCustomer(null);
    setShowForm(false);
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    setEditCustomer(null);
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
    editCustomer,
    refreshTrigger,
    handleEditClick,
    handleFormClose,
    handleToggleForm,
    handleDataUpdate,
  };
};

export default useCustomerPage;
