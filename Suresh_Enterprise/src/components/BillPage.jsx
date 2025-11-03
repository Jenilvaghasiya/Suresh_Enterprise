import React from "react";
import "../styles/BillPage.css";
import BillForm from "./BillForm";
import BillTable from "./BillTable";
import useBillPage from "../hooks/useBillPage";

const BillPage = () => {
  const { showForm, refreshTrigger, handleToggleForm, triggerRefresh, selectedInvoice, startEdit, cancelEdit } =
    useBillPage();

  return (
    <div className="bill-pages-container">
      <div className="bill-pages-header">
        <h2>Bill Management</h2>
        <button className="toggle-button" onClick={handleToggleForm}>
          {showForm ? "View Bills & Items" : "Create Invoice"}
        </button>
      </div>

      <div className="bill-body">
        {showForm ? (
          <BillForm onFormSubmit={triggerRefresh} initialInvoice={selectedInvoice} onCancel={cancelEdit} />
        ) : (
          <BillTable refreshTrigger={refreshTrigger} onEdit={startEdit} />
        )}
      </div>
    </div>
  );
};

export default BillPage;
