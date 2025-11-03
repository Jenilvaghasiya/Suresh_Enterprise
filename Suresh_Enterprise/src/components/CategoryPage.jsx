import React, { useState } from "react";
import CategoryForm from "../components/CategoryForm";
import CategoryTable from "../components/CategoryTable";
import useCategoryPage from "../hooks/useCategoryPage";
import "../styles/CategoryPage.css";

const CategoryPage = () => {
  const {
    showForm,
    editCategory,
    refreshTrigger,
    handleEditClick,
    handleToggleForm,
    handleDataUpdate,
  } = useCategoryPage();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <section className="category-page-container">
      <header className="category-page-header">
        <h2>Categories Management</h2>
        <button
          className="category-toggle-button"
          onClick={handleToggleForm}
          aria-label={
            showForm
              ? "Switch to Category Table View"
              : "Switch to Add Category Form"
          }
        >
          {showForm ? "View Categories" : "Add Category"}
        </button>
      </header>

      <main className="category-body">
        {showForm ? (
          <CategoryForm
            editCategory={editCategory}
            onDataUpdate={handleDataUpdate}
          />
        ) : (
          <>
            <div className="category-search-container">
              <input
                type="text"
                className="category-search-input"
                placeholder="Search categories by name..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <CategoryTable
              onEditClick={handleEditClick}
              refreshTrigger={refreshTrigger}
              searchQuery={searchQuery}
            />
          </>
        )}
      </main>
    </section>
  );
};

export default CategoryPage;
