import React from "react";
import "../styles/ConfirmModal.css";

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title || "Confirm Action"}</h3>
        </div>
        <div className="modal-body">
          <p>{message || "Are you sure you want to proceed?"}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-button modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-button modal-confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
