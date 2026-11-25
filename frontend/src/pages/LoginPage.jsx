import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/img/logo.png";
import { useAuth } from "../context/AuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7.5h16v9.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 16.7V7.5Zm0 0 8 6 8-6"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M8 11V8.2a4 4 0 0 1 8 0V11"
      />
      <rect
        x="6"
        y="11"
        width="12"
        height="9"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconEye({ off }) {
  if (off) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M4 4l16 16M9.9 9.9A3.2 3.2 0 0 0 12 15.2 3.2 3.2 0 0 0 14.9 13"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M6.2 6.8C4.3 8.1 3 9.8 2.4 12c1.7 6 8.1 8.5 12.8 6.4M17.7 15.7C19.5 14.5 20.8 12.9 21.6 12 19.9 6 13.5 3.5 8.8 5.6"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M2.5 12S6.2 6.5 12 6.5 21.5 12 21.5 12 17.8 17.5 12 17.5 2.5 12 2.5 12Z"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14M13 6l6 6-6 6"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        d="M12 3.2 5 6.2v5.4c0 4.2 2.8 7.6 7 8.9 4.2-1.3 7-4.7 7-8.9V6.2L12 3.2Z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M9.2 12.1 11 14l3.8-4.2" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        d="M12 4.2v1.8M12 18v1.8M4.2 12h1.8M18 12h1.8M6.3 6.3l1.3 1.3M16.4 16.4l1.3 1.3M17.7 6.3l-1.3 1.3M7.6 16.4 6.3 17.7"
      />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 17.5h9.2A3.3 3.3 0 0 0 20 14.4a3.3 3.3 0 0 0-3-3.3 4.4 4.4 0 0 0-8.4-1.1A3.4 3.4 0 0 0 5 13.3a3.3 3.3 0 0 0 2.5 4.2Z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const nextErrors = {};
    const correoTrim = correo.trim();

    if (!correoTrim) {
      nextErrors.correo = "El correo es obligatorio.";
    } else if (!EMAIL_PATTERN.test(correoTrim)) {
      nextErrors.correo = "El correo no tiene un formato válido.";
    }

    if (!clave.trim()) {
      nextErrors.clave = "La contraseña es obligatoria.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    const result = await login(correo.trim(), clave);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="sn-login">
      <div className="sn-login-beams" aria-hidden="true" />
      <div className="sn-login-panel">
        <section className="sn-login-brand" aria-label="Identidad Secure Net">
          <div className="sn-login-brand-photo" aria-hidden="true" />
          <div className="sn-login-brand-shield" aria-hidden="true" />
          <div className="sn-login-brand-content">
            <div className="sn-login-logo-plate">
              <img src={logo} alt="Logo Secure Net" />
            </div>
            <p className="sn-login-kicker sn-login-kicker-light">Plataforma corporativa</p>
            <h1>Secure Net</h1>
            <p className="sn-login-lead">
              Administración protegida de clientes,
              <br />
              servicios y operaciones de seguridad
              <br />
              tecnológica.
            </p>
            <ul className="sn-login-highlights">
              <li>
                <span className="sn-login-highlight-icon">
                  <IconShield />
                </span>
                <span>
                  Seguridad
                  <strong>Confiable</strong>
                </span>
              </li>
              <li>
                <span className="sn-login-highlight-icon">
                  <IconGear />
                </span>
                <span>
                  Gestión
                  <strong>Eficiente</strong>
                </span>
              </li>
              <li>
                <span className="sn-login-highlight-icon">
                  <IconCloud />
                </span>
                <span>
                  Tecnología
                  <strong>Siempre activa</strong>
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="sn-login-form-wrap">
          <form className="sn-login-card" onSubmit={handleSubmit} noValidate>
            <p className="sn-login-kicker">Acceso autorizado</p>
            <h2>Iniciar sesión</h2>
            <p className="sn-muted">
              Ingrese las credenciales institucionales para continuar al panel de control.
            </p>

            {formError ? (
              <div className="sn-alert" role="alert">
                {formError}
              </div>
            ) : null}

            <div className="sn-field">
              <label htmlFor="correo">Correo</label>
              <span className={`sn-input-shell${fieldErrors.correo ? " is-invalid" : ""}`}>
                <span className="sn-input-icon">
                  <IconMail />
                </span>
                <input
                  id="correo"
                  type="email"
                  name="correo"
                  autoComplete="username"
                  placeholder="ejemplo@dominio.com"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.correo)}
                  disabled={submitting}
                />
              </span>
              {fieldErrors.correo ? <span className="sn-field-error">{fieldErrors.correo}</span> : null}
            </div>

            <div className="sn-field">
              <label htmlFor="clave">Contraseña</label>
              <span className={`sn-input-shell${fieldErrors.clave ? " is-invalid" : ""}`}>
                <span className="sn-input-icon">
                  <IconLock />
                </span>
                <input
                  id="clave"
                  type={showPassword ? "text" : "password"}
                  name="clave"
                  autoComplete="current-password"
                  placeholder="Ingrese su contraseña"
                  value={clave}
                  onChange={(event) => setClave(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.clave)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="sn-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <IconEye off={showPassword} />
                </button>
              </span>
              {fieldErrors.clave ? <span className="sn-field-error">{fieldErrors.clave}</span> : null}
            </div>

            <button className="sn-btn sn-btn-block sn-btn-login" type="submit" disabled={submitting}>
              {submitting ? (
                <span className="sn-btn-loading">
                  <span className="sn-spinner" aria-hidden="true" />
                  Verificando acceso...
                </span>
              ) : (
                <>
                  <IconArrow />
                  Iniciar sesión
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
