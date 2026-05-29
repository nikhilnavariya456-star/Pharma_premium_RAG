import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2)
      return "Full name must be at least 2 characters.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      return "Enter a valid email address.";
    if (form.password.length < 6)
      return "Password must be at least 6 characters.";
    if (form.password !== form.confirm)
      return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);

    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.detail || "Signup failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2
    : 3;
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthClass = ["", "weak", "fair", "strong"][strength];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join us today to access professional legal guidance</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" id="signup-form" noValidate>
          <div className="form-group">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              name="name"
              type="text"
              placeholder="Jane Smith"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            {form.password.length > 0 && (
              <div className="password-strength">
                <div className={`strength-bar ${strengthClass}`}>
                  <div className="strength-fill"></div>
                </div>
                <span className={`strength-label ${strengthClass}`}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              name="confirm"
              type="password"
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-auth-submit"
            id="signup-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner">
                <span className="spinner"></span> Creating account…
              </span>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" id="goto-login">Log in here</Link>
        </p>
      </div>
    </div>
  );
}
