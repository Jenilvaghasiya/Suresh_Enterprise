import React from "react";
import "../styles/GstMaster.css";
import GstMasterForm from "./GstMasterForm";
import GstMaterTable from "./GstMaterTable";
import useGstMasterPage from "../hooks/useGstMasterPage";

const GstMasterPage = () => {
  const {
    showForm,
    editGst,
    refreshTrigger,
    handleEditClick,
    handleToggleForm,
    handleDataUpdate,
  } = useGstMasterPage();

  return (
    <div className="gst-master-page-container">
      <div className="gst-master-page-header">
        <h2>GST Rate Management</h2>
        <button className="gst-toggle-button" onClick={handleToggleForm}>
          {showForm ? "View GST List" : "Add GST Rate"}
        </button>
      </div>

      <div className="gst-master-body">
        {showForm ? (
          <GstMasterForm editGst={editGst} onDataUpdate={handleDataUpdate} />
        ) : (
          <GstMaterTable
            onEditClick={handleEditClick}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
};

export default GstMasterPage;
