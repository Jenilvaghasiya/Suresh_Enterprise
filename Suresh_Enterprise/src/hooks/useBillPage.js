import { useState } from "react";

const useBillPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleToggleForm = () => {
    setShowForm(!showForm);
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowForm(false);
    setSelectedInvoice(null);
  };

  const startEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setSelectedInvoice(null);
    setShowForm(false);
  };

  return {
    showForm,
    refreshTrigger,
    handleToggleForm,
    triggerRefresh,
    selectedInvoice,
    startEdit,
    cancelEdit
  };
};

export default useBillPage;
