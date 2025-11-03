import { useState } from "react";

const useUserPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditClick = (user) => {
    setEditUser(user);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setEditUser(null);
    setShowForm(false);
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    setEditUser(null);
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
    editUser,
    refreshTrigger,
    handleEditClick,
    handleFormClose,
    handleToggleForm,
    handleDataUpdate,
  };
};

export default useUserPage;
