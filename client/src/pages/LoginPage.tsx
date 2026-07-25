import { useState } from "react";
import { FiMoon } from "react-icons/fi";
import { firebaseConfigurationError } from "../services/firebase";
import { Brand, CloudBackdrop } from "../components/layout/AppChrome";

export default function LoginPage({ onLogin }: { onLogin: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    setError("");
    setLoading(true);
    try {
      await onLogin();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google sign-in could not start.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <CloudBackdrop />
      <section className="login-card">
        <Brand />
        <div className="login-illustration">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <FiMoon />
        </div>
        <p className="eyebrow">Your private dream space</p>
        <h1>Wake up to what<br />your mind remembers.</h1>
        <p className="login-copy">Capture your dreams before they fade, then discover gentle patterns over time.</p>
        <button className="google-button" onClick={signIn} disabled={loading || Boolean(firebaseConfigurationError)}>
          <span className="google-g">G</span>
          {loading ? "Opening your journal…" : "Continue with Google"}
        </button>
        <p className="privacy-note">Private by design. Your dreams belong to you.</p>
        {(firebaseConfigurationError || error) && (
          <p className="configuration-error" role="alert">{error || firebaseConfigurationError}</p>
        )}
      </section>
      <p className="login-footer">A calm place for the stories you tell yourself at night.</p>
    </main>
  );
}
