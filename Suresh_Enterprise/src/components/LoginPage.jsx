import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, safeApiCall } from "../services/api";
import { toast } from "../utils/toast";
import "../styles/LoginPage.css";

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      toast.error("Please enter both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const [data, apiError] = await safeApiCall(loginUser, {
        email,
        password,
      });

      if (apiError) {
        setError(apiError);
        toast.error(apiError);
        setLoading(false);
        return;
      }

      if (data && data.success) {
        // Store user info in localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("isAuthenticated", "true");

        // Show success message with user type
        toast.success(`Welcome ${data.user.name}! (${data.user.userType})`);

        // Call the onLoginSuccess callback to update App state
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }

        // Navigate to admin panel (both Admin User and Customer User go here)
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg = "An unexpected error occurred. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">User Login</h2>
        <p className="login-subtitle">Please sign in to continue</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
