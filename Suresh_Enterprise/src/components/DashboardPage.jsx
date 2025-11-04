import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, Package, FileText, TrendingUp } from "lucide-react";
import { safeApiCall, getCustomers, getProducts, getInvoices, getCategories } from "../services/api";

const DashboardPage = () => {
  const [totals, setTotals] = useState({ customers: 0, products: 0, invoices: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryPie, setCategoryPie] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      // Read current user and determine scope
      let currentUser = null;
      try {
        currentUser = JSON.parse(localStorage.getItem("user") || "null");
      } catch {}
      const isCustomer = currentUser?.userType === "Customer User";
      const companyId = currentUser?.company_id;

      const [custRes, custErr] = await safeApiCall(getCustomers);
      const [prodRes, prodErr] = await safeApiCall(getProducts);
      const [invRes, invErr] = await safeApiCall(getInvoices);
      const [catRes, catErr] = await safeApiCall(getCategories);

      const firstErr = custErr || prodErr || invErr || catErr;
      if (firstErr) {
        setError(firstErr);
        setLoading(false);
        return;
      }

      let customers = Array.isArray(custRes?.data) ? custRes.data : [];
      let products = Array.isArray(prodRes?.data) ? prodRes.data : [];
      let invoices = Array.isArray(invRes?.data) ? invRes.data : [];
      let categories = Array.isArray(catRes?.data) ? catRes.data : [];

      if (isCustomer && companyId) {
        customers = customers.filter((c) => c.company_id === companyId);
        products = products.filter((p) => p.company_id === companyId);
        categories = categories.filter((c) => c.company_id === companyId);
        invoices = invoices.filter((inv) => inv.companyProfileId === companyId);
      }

      const revenue = invoices.reduce((sum, inv) => sum + Number(inv.billValue || 0), 0);

      // Build category distribution: number of products per category
      const counts = new Map();
      for (const cat of categories) counts.set(cat.id, 0);
      for (const p of products) {
        if (p.category_id != null && counts.has(p.category_id)) {
          counts.set(p.category_id, counts.get(p.category_id) + 1);
        }
      }
      const pie = categories.map((c) => ({ name: c.name || `Category ${c.id}`, value: counts.get(c.id) || 0 }));

      setTotals({
        customers: customers.length,
        products: products.length,
        invoices: invoices.length,
        revenue,
      });
      setCategoryPie(pie);
      setLoading(false);
    };

    load();
  }, []);

  const statCards = [
    { 
      title: "Total Customers", 
      value: totals.customers, 
      icon: Users, 
      color: "#165638",
      bg: "#e7f2ec",
    },
    { 
      title: "Total Products", 
      value: totals.products, 
      icon: Package, 
      color: "#0ea5e9",
      bg: "#e0f2fe",
    },
    { 
      title: "Total Invoices", 
      value: totals.invoices, 
      icon: FileText, 
      color: "#8b5cf6",
      bg: "#f3e8ff",
    },
    { 
      title: "Total Revenue", 
      value: `₹${Number(totals.revenue || 0).toLocaleString('en-IN')}`, 
      icon: TrendingUp, 
      color: "#f59e0b",
      bg: "#fef3c7",
    },
  ];

  const COLORS = ["#165638", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#f97316"]; 

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1f2937", marginBottom: "8px" }}>
          Dashboard
        </h1>
        {/* <p style={{ color: "#6b7280", fontSize: "14px" }}>
          Welcome back! Here's what's happening with your business today.
        </p> */}
      </div>

      {error && (
        <div style={{ 
          background: "#fde8e8", 
          color: "#9b1c1c", 
          border: "1px solid #f8c7c7", 
          padding: "12px 14px", 
          borderRadius: "10px", 
          marginBottom: "20px" 
        }}>
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
        gap: "20px", 
        marginBottom: "24px" 
      }}>
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div key={index} style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              padding: "20px",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ 
                position: "absolute", 
                top: 0, 
                left: 0, 
                width: "4px", 
                height: "100%", 
                background: card.color 
              }}></div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                    {card.title}
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: "800", color: "#1f2937" }}>
                    {loading ? "-" : card.value}
                  </p>
                </div>
                <div style={{ 
                  width: "48px", 
                  height: "48px", 
                  borderRadius: "12px", 
                  background: card.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: card.color
                }}>
                  <IconComponent size={20} />
                </div>
              </div>
              
              {/* No trend UI */}
            </div>
          );
        })}
      </div>

      {/* Categories Pie Chart */}
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: "20px"
      }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
          Categories
        </h3>
        {!loading && (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryPie}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
                dataKey="value"
              >
                {categoryPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        {loading && <p>Loading...</p>}
        {!loading && categoryPie.length === 0 && (
          <p style={{ color: "#6b7280" }}>No categories found.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;