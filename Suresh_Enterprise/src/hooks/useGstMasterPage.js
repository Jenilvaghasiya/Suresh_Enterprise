import { useState } from "react";

const useGstMasterPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editGst, setEditGst] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditClick = (gst) => {
    setEditGst(gst);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setEditGst(null);
    setShowForm(false);
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    setEditGst(null);
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
    editGst,
    refreshTrigger,
    handleEditClick,
    handleFormClose,
    handleToggleForm,
    handleDataUpdate,
  };
};

export default useGstMasterPage;
