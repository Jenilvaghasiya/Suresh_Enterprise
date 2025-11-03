import React from "react";
import "../styles/CustomerPage.css";
import CustomerForm from "../components/CustomerForm";
import CustomerTable from "../components/CustomerTable";
import useCustomerPage from "../hooks/useCustomerPage";

const CustomerPage = () => {
  const {
    showForm,
    editCustomer,
    refreshTrigger,
    handleEditClick,
    handleToggleForm,
    handleDataUpdate,
  } = useCustomerPage();

  return (
    <div className="customer-page-container">
      <div className="customer-page-header">
        <h2>Customers Management</h2>
        <button className="customer-toggle-button" onClick={handleToggleForm}>
          {showForm ? "View Customers" : "Add Customers"}
        </button>
      </div>

      <div className="customer-body">
        {showForm ? (
          <CustomerForm
            editCustomer={editCustomer}
            onDataUpdate={handleDataUpdate}
          />
        ) : (
          <CustomerTable
            onEditClick={handleEditClick}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerPage;
