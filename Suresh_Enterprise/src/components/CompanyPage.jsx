import React, { useState } from "react";
import "../styles/CompanyPage.css";
import CompanyForm from "../components/CompanyForm";
import CompanyTable from "../components/CompanyTable";
import useCompanyPage from "../hooks/useCompanyPage";

const CompanyPage = () => {
  const {
    showForm,
    editCompany,
    refreshTrigger,
    handleEditClick,
    handleToggleForm,
    handleDataUpdate,
  } = useCompanyPage();

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const isCustomer = currentUser?.userType === "Customer User";

  return (
    <div className="company-page-container">
      <div className="company-page-header">
        <h2>Company Profile Management</h2>
        {!isCustomer && (
          <button className="company-toggle-button" onClick={handleToggleForm}>
            {showForm ? "View Companies" : "Add Company"}
          </button>
        )}
      </div>
      <div className="company-body">
        {showForm ? (
          <CompanyForm
            editCompany={editCompany}
            onDataUpdate={handleDataUpdate}
          />
        ) : (
          <CompanyTable
            onEditClick={handleEditClick}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyPage;
