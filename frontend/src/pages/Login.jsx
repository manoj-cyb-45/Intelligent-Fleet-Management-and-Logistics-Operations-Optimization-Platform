import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(userId, password);
      navigate("/");
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-glow login-glow-one" />
      <div className="login-background-glow login-glow-two" />

      <main className="login-shell">
        <section className="login-brand-panel">
          <div className="login-brand-mark">
            <span className="login-brand-icon">F</span>
          </div>

          <div>
            <h1 className="login-brand-name">FleetFlow</h1>
            <p className="login-brand-tagline">
              Fleet Management &amp; Logistics Platform
            </p>
          </div>

          <div className="login-brand-divider" />

          <div className="login-feature-list">
            <div className="login-feature">
              <span className="login-feature-dot" />
              <span>Fleet operations in one place</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" />
              <span>Real-time shipment visibility</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" />
              <span>Maintenance &amp; fuel tracking</span>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-header">
            <span className="login-eyebrow">SECURE ACCESS</span>
            <h2>Welcome back</h2>
            <p>Sign in to access your FleetFlow workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="userId">User ID</label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="Enter your user ID"
                required
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <span className="login-submit-arrow">→</span>}
            </button>
          </form>

          <p className="login-footer">
            Authorized users only
          </p>
        </section>
      </main>
    </div>
  );
}

export default Login;
