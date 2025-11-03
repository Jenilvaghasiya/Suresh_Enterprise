import React from "react";
import UserForm from "../components/UserForm";
import UserTable from "../components/UserTable";
import useUserPage from "../hooks/useUserPage";
import "../styles/UserPage.css"; // We will create this file next

const UserPage = () => {
  const {
    showForm,
    editUser,
    refreshTrigger,
    handleEditClick,
    handleToggleForm,
    handleDataUpdate,
  } = useUserPage();

  return (
    <section className="user-page-container">
      <header className="user-page-header">
        <h2>Users Management</h2>
        <button className="user-toggle-button" onClick={handleToggleForm}>
          {showForm ? "View Users" : "Add User"}
        </button>
      </header>
      <main className="user-body">
        {showForm ? (
          <UserForm editUser={editUser} onDataUpdate={handleDataUpdate} />
        ) : (
          <UserTable
            onEditClick={handleEditClick}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>
    </section>
  );
};

export default UserPage;
