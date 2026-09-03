import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const validate = () => {
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (password !== confirm) return 'Passwords do not match.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setError('')
    setLoading(true)
    const { data, error: err } = await signUp(email, password)
    setLoading(false)

    if (err) {
      setError(err.message || 'Sign up failed. Please try again.')
      return
    }

    // Supabase returns a session immediately if email confirmation is disabled,
    // or returns a user with no session if email confirmation is required.
    if (data.session) {
      navigate('/', { replace: true })
    } else {
      setConfirmationSent(true)
    }
  }

  if (confirmationSent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>✉️</div>
          <h1 style={styles.title}>Check your email</h1>
          <p style={styles.confirmMsg}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account, then{' '}
            <Link to="/login" style={styles.link}>
              sign in
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Start watching in seconds</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              style={{
                ...styles.input,
                ...(confirm && confirm !== password
                  ? { borderColor: 'var(--accent)' }
                  : {}),
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={styles.submitBtn}
          >
            {loading ? <span style={styles.spinner} /> : null}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: 'var(--bg)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 36px',
    boxShadow: 'var(--shadow-pop)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: '32px',
    letterSpacing: '0.3px',
    margin: '0 0 6px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    margin: '0 0 28px',
  },
  iconWrap: {
    fontSize: '40px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  confirmMsg: {
    color: 'var(--text-muted)',
    fontSize: '15px',
    lineHeight: 1.7,
    margin: '8px 0 0',
    textAlign: 'center',
  },
  errorBox: {
    background: 'var(--accent-10)',
    border: '1px solid var(--accent-30)',
    borderRadius: 'var(--radius-sm)',
    color: '#ff6b6b',
    fontSize: '13px',
    padding: '10px 14px',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--text)',
    fontSize: '15px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 0.18s',
  },
  submitBtn: {
    marginTop: '8px',
    background: 'var(--accent)',
    color: '#fff',
    justifyContent: 'center',
    padding: '13px',
    fontSize: '15px',
    width: '100%',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginRight: '8px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  link: {
    color: 'var(--accent)',
    fontWeight: 600,
  },
}
