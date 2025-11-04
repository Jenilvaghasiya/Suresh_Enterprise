import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGauge,
  faTag,
  faBox,
  faUsers,
  faFileInvoiceDollar,
  faBuilding,
  faFileInvoice,
  faUserCog,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { logoutUser, safeApiCall, getCompanyById, fileUrl } from "../services/api";
import "../styles/SideBar.css";
import Logo from "../assets/images/logo.png";

const SideBar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(Logo);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setIsOpen(!mobile);
  }, []);

  useEffect(() => {
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };
    window.addEventListener("resize", debouncedResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [handleResize]);

  useEffect(() => {
    const loadCompanyLogo = async () => {
      if (!user?.company_id) {
        setCompanyLogoUrl(Logo);
        return;
      }
      const [res] = await safeApiCall(() => getCompanyById(user.company_id));
      if (res?.success && res.data?.companyLogo) {
        setCompanyLogoUrl(fileUrl(res.data.companyLogo));
      } else {
        setCompanyLogoUrl(Logo);
      }
    };
    loadCompanyLogo();
  }, [user]);

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const closeSidebarOnMobile = () => isMobile && setIsOpen(false);

  const handleLogout = async () => {
    try {
      await safeApiCall(logoutUser);
      onLogout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still logout on frontend even if backend call fails
      onLogout();
      navigate("/login");
    }
  };

  const navItems = [
    { to: "/dashboard", icon: faGauge, text: "Dashboard" },
    { to: "/", icon: faTag, text: "Category" },
    { to: "/products", icon: faBox, text: "Product" },
    { to: "/customers", icon: faUsers, text: "Customer" },
    { to: "/gst-masters", icon: faFileInvoiceDollar, text: "GST Master" },
    { to: "/companies", icon: faBuilding, text: "Company Profile" },
    { to: "/invoice-form", icon: faFileInvoice, text: "Invoices" },
    { to: "/users", icon: faUserCog, text: "Users" },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={closeSidebarOnMobile}></div>
      )}

      {/* Sidebar */}
      <aside
        id="main-sidebar"
        className={`sidebar ${isOpen ? "open" : "closed"}`}
      >
        <div className="sidebar-header">
          <img src={companyLogoUrl} alt="Company logo" className="sidebar-logo" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon, text }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={closeSidebarOnMobile}
            >
              <span className="sidebar-icon">
                <FontAwesomeIcon icon={icon} />
              </span>
              <span className="sidebar-text">{text}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user.name}</p>
              <p className="sidebar-user-type">{user.userType}</p>
            </div>
          )}
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <span className="sidebar-icon">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </span>
            <span className="sidebar-text">Logout</span>
          </button>
          <p className="sidebar-version">v1.0.0</p>
        </div>
      </aside>

      {/* Toggle button - placed after sidebar */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={isOpen ? "Close Sidebar" : "Open Sidebar"}
        aria-expanded={isOpen}
        aria-controls="main-sidebar"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
    </>
  );
};

export default SideBar;
