import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SideBar from './components/SideBar';
import CategoryPage from './components/CategoryPage';
import ProductPage from "./components/ProductPage";
import CompanyPage from "./components/CompanyPage";
import CustomerPage from "./components/CustomerPage";
import GstMasterPage from "./components/GstMasterPage";
import BillPage from "./components/BillPage";
import UserPage from "./components/UserPage";
import LoginPage from './components/LoginPage';
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  };

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      const storedAuth = localStorage.getItem('isAuthenticated');
      const storedUser = localStorage.getItem('user');

      if (storedAuth === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
    }
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <Router>
      <div className="app-layout">
        {isAuthenticated && <SideBar user={user} onLogout={handleLogout} />}
        <main className={isAuthenticated ? "main-content" : "main-content-full"}>
          <Routes>
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <CategoryPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products" 
              element={
                <ProtectedRoute>
                  <ProductPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customers" 
              element={
                <ProtectedRoute>
                  <CustomerPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/gst-masters" 
              element={
                <ProtectedRoute>
                  <GstMasterPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/companies" 
              element={
                <ProtectedRoute>
                  <CompanyPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invoice-form" 
              element={
                <ProtectedRoute>
                  <BillPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute>
                  <UserPage />
                </ProtectedRoute>
              } 
            />
            {/* Redirect any unknown routes to login or home */}
            <Route 
              path="*" 
              element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
