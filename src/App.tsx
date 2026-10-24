import { useEffect, useMemo, useState } from 'react'
import './App.css'
import CoachChat from './CoachChat'
type Transaction = {
  id: string
  name: string
  category: string
  date: string
  amount: number
  icon: string
}
type Goal = {
  id: string
  name: string
  target: number
  saved: number
}
type ApiTransaction = {
  id: number
  name: string
  category: string
  amount: number
  kind: 'income' | 'expense'
  transaction_date: string
}
type ApiGoal = {
  id: number
  name: string
  target: number
  saved: number
}
type AuthResponse = {
  access_token: string
  token_type: string
  user: {
    id: number
    email: string
  }
}
const API_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '')
const REMINDER_KEY = 'vikasana-reminders'
const TOKEN_KEY = 'vikasana-token'
const EMAIL_KEY = 'vikasana-email'
const categories = [
  'Food & Dining',
  'Shopping',
  'Transport',
  'Subscriptions',
  'Bills',
  'Education',
  'Health',
  'Entertainment',
  'Other',
]
const navItems = [
  { id: 'overview', icon: '◫', label: 'Overview' },
  { id: 'transactions', icon: '↔', label: 'Transactions' },
  { id: 'insights', icon: '◉', label: 'Spending insights' },
  { id: 'goals', icon: '◎', label: 'Savings goals' },
  { id: 'coach', icon: '✳', label: 'Money coach' },
]
const money = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`
function todayISO() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}
function transactionIcon(
  category: string,
  kind: 'income' | 'expense',
) {
  if (kind === 'income') return '💰'
  if (category === 'Food & Dining') return '🍔'
  if (category === 'Shopping') return '🛍️'
  if (category === 'Transport') return '🚕'
  if (category === 'Subscriptions') return '🎬'
  if (category === 'Education') return '📚'
  if (category === 'Health') return '💚'
  if (category === 'Entertainment') return '🎟️'
  if (category === 'Bills') return '🧾'
  return '💳'
}
function fromApiTransaction(item: ApiTransaction): Transaction {
  return {
    id: String(item.id),
    name: item.name,
    category: item.category,
    date: item.transaction_date.slice(0, 10),
    amount: item.kind === 'income' ? item.amount : -item.amount,
    icon: transactionIcon(item.category, item.kind),
  }
}
function dateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}
async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  })
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') {
        detail = body.detail
      } else if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((item: { msg?: string }) => item.msg || 'Invalid input')
          .join('; ')
      }
    } catch {
      // Keep the default error message.
    }
    throw new Error(detail)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}
function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem(EMAIL_KEY) || '',
  )
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem(TOKEN_KEY)),
  )
  const [activeSection, setActiveSection] = useState('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedMonth, setSelectedMonth] = useState(todayISO().slice(0, 7))
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [transactionName, setTransactionName] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionType, setTransactionType] =
    useState<'expense' | 'income'>('expense')
  const [transactionCategory, setTransactionCategory] =
    useState('Food & Dining')
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [contributionGoalId, setContributionGoalId] = useState('')
  const [contributionAmount, setContributionAmount] = useState('500')
  const [message, setMessage] = useState('')
  const [remindersEnabled, setRemindersEnabled] = useState(
    () => safeRead(REMINDER_KEY, false),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  async function refreshData() {
    const [txData, goalData] = await Promise.all([
      apiRequest<ApiTransaction[]>('/api/transactions'),
      apiRequest<ApiGoal[]>('/api/goals'),
    ])
    setTransactions(txData.map(fromApiTransaction))
    setGoals(
      goalData.map((goal) => ({
        id: String(goal.id),
        name: goal.name,
        target: goal.target,
        saved: goal.saved,
      })),
    )
    setApiConnected(true)
  }
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false
    async function loadData() {
      setLoading(true)
      try {
        await refreshData()
        if (!cancelled) {
          setMessage('')
        }
      } catch (error) {
        if (cancelled) return
        setApiConnected(false)
        setMessage(
          `Could not load your data. Check that the backend is running. ${
            error instanceof Error ? error.message : ''
          }`,
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void loadData()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])
  useEffect(() => {
    try {
      localStorage.setItem(
        REMINDER_KEY,
        JSON.stringify(remindersEnabled),
      )
    } catch {
      // Reminder preferences are optional.
    }
  }, [remindersEnabled])
  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.date.slice(0, 7) === selectedMonth,
      ),
    [transactions, selectedMonth],
  )
  const income = monthTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const expenses = monthTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
  const cashFlow = income - expenses
  const savingsRate = income > 0 ? (cashFlow / income) * 100 : null
  const categoryTotals = categories
    .map((name) => ({
      name,
      amount: monthTransactions
        .filter(
          (transaction) =>
            transaction.category === name && transaction.amount < 0,
        )
        .reduce(
          (sum, transaction) => sum + Math.abs(transaction.amount),
          0,
        ),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const topCategory = categoryTotals[0]
  const maxCategory = Math.max(
    1,
    ...categoryTotals.map((item) => item.amount),
  )
  const suggestedSaving = topCategory
    ? Math.min(
        1000,
        Math.max(50, Math.round((topCategory.amount * 0.1) / 10) * 10),
      )
    : 50
  function navigateTo(id: string) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  async function handleAuthentication(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    const email = authEmail.trim().toLowerCase()
    if (!email || !authPassword) {
      setMessage('Enter your email and password.')
      return
    }
    setAuthBusy(true)
    setMessage('')
    try {
      const endpoint =
        authMode === 'register'
          ? '/api/auth/register'
          : '/api/auth/login'
      const result = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: authPassword,
        }),
      })
      localStorage.setItem(TOKEN_KEY, result.access_token)
      localStorage.setItem(EMAIL_KEY, result.user.email)
      setUserEmail(result.user.email)
      setIsAuthenticated(true)
      setAuthPassword('')
      setLoading(true)
      try {
        await refreshData()
        setMessage('Welcome to Vikasana!')
      } catch (error) {
        setApiConnected(false)
        setMessage(
          `Signed in, but data could not load: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        )
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Authentication failed. Please try again.',
      )
    } finally {
      setAuthBusy(false)
      setLoading(false)
    }
  }
  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
    setIsAuthenticated(false)
    setUserEmail('')
    setTransactions([])
    setGoals([])
    setApiConnected(false)
    setMessage('')
    setAuthPassword('')
    setAuthEmail('')
    setActiveSection('overview')
  }
  async function addTransaction(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    const name = transactionName.trim()
    const amount = Number(transactionAmount)
    if (!name || !Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a name and an amount greater than zero.')
      return
    }
    setSaving(true)
    try {
      const category =
        transactionType === 'income' ? 'Income' : transactionCategory
      const created = await apiRequest<ApiTransaction>(
        '/api/transactions',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            category,
            amount,
            kind: transactionType,
            transaction_date: todayISO(),
          }),
        },
      )
      const transaction = fromApiTransaction(created)
      setTransactions((current) => [transaction, ...current])
      setSelectedMonth(transaction.date.slice(0, 7))
      setTransactionName('')
      setTransactionAmount('')
      setShowTransactionForm(false)
      setMessage('Transaction saved successfully.')
    } catch (error) {
      setMessage(
        `Transaction was not saved: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setSaving(false)
    }
  }
  async function deleteTransaction(id: string) {
    if (!/^\d+$/.test(id)) {
      setMessage('Invalid transaction ID. Refresh the dashboard.')
      return
    }
    setSaving(true)
    try {
      await apiRequest<void>(`/api/transactions/${id}`, {
        method: 'DELETE',
      })
      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== id),
      )
      setMessage('Transaction deleted.')
    } catch (error) {
      setMessage(
        `Could not delete transaction: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setSaving(false)
    }
  }
  async function addGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = goalName.trim()
    const target = Number(goalTarget)
    if (!name || !Number.isFinite(target) || target <= 0) {
      setMessage('Enter a goal name and a target greater than zero.')
      return
    }
    setSaving(true)
    try {
      const created = await apiRequest<ApiGoal>('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          target,
          saved: 0,
        }),
      })
      setGoals((current) => [
        ...current,
        {
          id: String(created.id),
          name: created.name,
          target: created.target,
          saved: created.saved,
        },
      ])
      setGoalName('')
      setGoalTarget('')
      setShowGoalForm(false)
      setMessage('Savings goal created.')
    } catch (error) {
      setMessage(
        `Could not create goal: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setSaving(false)
    }
  }
  async function contributeToGoal(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    const amount = Number(contributionAmount)
    if (
      !contributionGoalId ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMessage('Choose a goal and enter an amount greater than zero.')
      return
    }
    const goal = goals.find(
      (item) => item.id === contributionGoalId,
    )
    if (!goal) {
      setMessage('That savings goal could not be found.')
      return
    }
    if (goal.saved >= goal.target) {
      setMessage('That goal is already complete.')
      return
    }
    setSaving(true)
    try {
      const updated = await apiRequest<ApiGoal>(
        `/api/goals/${goal.id}/contribute`,
        {
          method: 'POST',
          body: JSON.stringify({ amount }),
        },
      )
      setGoals((current) =>
        current.map((item) =>
          item.id === String(updated.id)
            ? { ...item, saved: updated.saved }
            : item,
        ),
      )
      setMessage(
        `${money(updated.saved - goal.saved)} added to ${goal.name}.`,
      )
      setContributionAmount('500')
      setContributionGoalId('')
    } catch (error) {
      setMessage(
        `Contribution failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setSaving(false)
    }
  }
  async function deleteGoal(id: string) {
    if (!/^\d+$/.test(id)) {
      setMessage('Invalid savings goal ID.')
      return
    }
    setSaving(true)
    try {
      await apiRequest<void>(`/api/goals/${id}`, {
        method: 'DELETE',
      })
      setGoals((current) =>
        current.filter((goal) => goal.id !== id),
      )
      if (contributionGoalId === id) {
        setContributionGoalId('')
      }
      setMessage('Savings goal deleted.')
    } catch (error) {
      setMessage(
        `Could not delete goal: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setSaving(false)
    }
  }
  function exportTransactions() {
    const quote = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`
    const rows = [
      ['Name', 'Category', 'Date', 'Amount'].map(quote).join(','),
      ...transactions.map((transaction) =>
        [
          transaction.name,
          transaction.category,
          transaction.date,
          transaction.amount,
        ]
          .map(quote)
          .join(','),
      ),
    ]
    const url = URL.createObjectURL(
      new Blob([rows.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'vikasana-transactions.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  async function enableReminders() {
    if (!('Notification' in window)) {
      setMessage('This browser does not support notifications.')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage('Notifications were not enabled.')
        return
      }
      setRemindersEnabled(true)
      new Notification('Vikasana money check-in', {
        body: 'Review your spending and savings when convenient.',
      })
      setMessage(
        'Notifications enabled. This prototype sends a test notification, not scheduled background reminders.',
      )
    } catch {
      setMessage('Could not enable notifications in this browser.')
    }
  }
  function disableReminders() {
    setRemindersEnabled(false)
    setMessage('Reminder preference turned off.')
  }
  if (!isAuthenticated) {
    return (
      <main className="app-shell">
        <section
          className="main-content"
          style={{
            maxWidth: 480,
            margin: 'auto',
            width: '100%',
            padding: 24,
          }}
        >
          <article className="panel">
            <div className="brand">
              <div className="brand-mark">v.</div>
              <div>
                <h2>vikasana</h2>
                <span>YOUR MONEY, GROWING</span>
              </div>
            </div>
            <h1 style={{ marginTop: 32 }}>
              {authMode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h1>
            <p>Understand your money. Choose your next step.</p>
            {message && (
              <p className="feedback-message" role="alert">
                {message}
              </p>
            )}
            <form
              className="goal-form"
              onSubmit={handleAuthentication}
            >
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                value={authEmail}
                onChange={(event) =>
                  setAuthEmail(event.target.value)
                }
                autoComplete="email"
                required
              />
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={authPassword}
                onChange={(event) =>
                  setAuthPassword(event.target.value)
                }
                autoComplete={
                  authMode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                minLength={8}
                maxLength={128}
                required
              />
              <button
                className="primary-button"
                type="submit"
                disabled={authBusy}
              >
                {authBusy
                  ? 'Please wait…'
                  : authMode === 'login'
                    ? 'Log in'
                    : 'Create account'}
              </button>
            </form>
            <p style={{ marginTop: 20 }}>
              {authMode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </p>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setAuthMode((mode) =>
                  mode === 'login' ? 'register' : 'login',
                )
                setMessage('')
              }}
            >
              {authMode === 'login'
                ? 'Create an account'
                : 'Log in instead'}
            </button>
          </article>
        </section>
      </main>
    )
  }
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button
          className="brand brand-button"
          type="button"
          onClick={() => navigateTo('overview')}
        >
          <div className="brand-mark">v.</div>
          <div>
            <h2>vikasana</h2>
            <span>YOUR MONEY, GROWING</span>
          </div>
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav className="navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${
                activeSection === item.id ? 'active' : ''
              }`}
              onClick={() => navigateTo(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'coach' && (
                <span className="new-tag">AI</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-card">
            <span className="streak-icon">🌱</span>
            <div>
              <strong>Small steps count</strong>
              <p>Build a habit at your pace.</p>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">V</div>
            <div style={{ minWidth: 0 }}>
              <strong>{userEmail || 'Vikasana account'}</strong>
              <p>Personal account</p>
            </div>
            <button
              className="cancel-button"
              type="button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <section className="main-content" id="overview">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              YOUR PERSONAL FINANCE SPACE
            </span>
            <h1>Your financial space</h1>
          </div>
          <button
            className="outline-button"
            type="button"
            onClick={exportTransactions}
          >
            ↗ Export transactions
          </button>
        </header>
        <section className="welcome-row">
          <div>
            <h2>
              A little progress adds up. <span>✦</span>
            </h2>
            <p>Understand your money. Choose your next step.</p>
          </div>
          <div className="wellness-pill">
            <span />
            Financial wellness: <strong>Building</strong>
          </div>
        </section>
        <article className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-heading">
            <div>
              <h3>Monthly report</h3>
              <p>Totals for your selected month</p>
            </div>
            <input
              aria-label="Select reporting month"
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
            />
          </div>
          <p>
            {loading
              ? 'Loading your database records…'
              : `${monthTransactions.length} recorded transaction(s).`}{' '}
            Figures reflect entered data, not a verified bank account.
          </p>
          <p role="status">
            {apiConnected
              ? '● Connected to Vikasana API'
              : '○ API not connected'}
          </p>
        </article>
        {message && (
          <p className="feedback-message" role="status">
            {message}
          </p>
        )}
        <section className="metrics-grid">
          <article className="metric-card balance-card">
            <div className="metric-top">
              <span>Net cash flow</span>
              <span className="metric-icon">₹</span>
            </div>
            <h2>{money(cashFlow)}</h2>
            <p>Income minus expenses for the selected month</p>
          </article>
          <article className="metric-card">
            <div className="metric-top">
              <span>Income this month</span>
              <span className="metric-icon green">↙</span>
            </div>
            <h2>{money(income)}</h2>
            <p>Recorded positive transactions</p>
          </article>
          <article className="metric-card">
            <div className="metric-top">
              <span>Expenses this month</span>
              <span className="metric-icon orange">↗</span>
            </div>
            <h2>{money(expenses)}</h2>
            <p>
              {savingsRate === null
                ? 'Add income to calculate a savings rate.'
                : `Net savings rate: ${savingsRate.toFixed(1)}%`}
            </p>
          </article>
        </section>
        <section className="content-grid">
          <article className="panel" id="insights">
            <div className="panel-heading">
              <div>
                <h3>Spending insights</h3>
                <p>Where your money went this month</p>
              </div>
            </div>
            {categoryTotals.length === 0 ? (
              <p>
                Add a few expenses to see your spending breakdown.
              </p>
            ) : (
              <div className="category-list">
                {categoryTotals.map((item) => (
                  <div
                    key={item.name}
                    className="category-row"
                  >
                    <div className="category-heading">
                      <span>{item.name}</span>
                      <strong>{money(item.amount)}</strong>
                    </div>
                    <div
                      style={{
                        background: '#e9e9ef',
                        height: 8,
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${(item.amount / maxCategory) * 100}%`,
                          height: '100%',
                          background: '#6c63ff',
                          borderRadius: 8,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <h3>Your next small step</h3>
                <p>A gentle suggestion based on your entries</p>
              </div>
            </div>
            {topCategory ? (
              <>
                <p>
                  Your largest recorded expense category is{' '}
                  <strong>{topCategory.name}</strong>.
                </p>
                <p>
                  If it fits your needs, consider setting aside{' '}
                  <strong>{money(suggestedSaving)}</strong> as a
                  small savings target.
                </p>
              </>
            ) : (
              <p>
                Start by recording your income and expenses. You can
                then spot patterns without judging your spending.
              </p>
            )}
            <button
              className="primary-button"
              type="button"
              onClick={() => navigateTo('goals')}
            >
              Review savings goals
            </button>
          </article>
        </section>
        <section className="content-grid">
          <article className="panel" id="goals">
            <div className="panel-heading">
              <div>
                <h3>Savings goals</h3>
                <p>Build progress one contribution at a time</p>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  setShowGoalForm((current) => !current)
                }
              >
                {showGoalForm ? 'Cancel' : '+ Create goal'}
              </button>
            </div>
            {showGoalForm && (
              <form className="goal-form" onSubmit={addGoal}>
                <label htmlFor="goal-name">Goal name</label>
                <input
                  id="goal-name"
                  value={goalName}
                  onChange={(event) =>
                    setGoalName(event.target.value)
                  }
                  required
                  maxLength={80}
                  placeholder="e.g. Emergency fund"
                />
                <label htmlFor="goal-target">
                  Target amount (₹)
                </label>
                <input
                  id="goal-target"
                  type="number"
                  min="1"
                  step="1"
                  value={goalTarget}
                  onChange={(event) =>
                    setGoalTarget(event.target.value)
                  }
                  required
                />
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Create savings goal'}
                </button>
              </form>
            )}
            {goals.length === 0 ? (
              <p>
                No savings goals yet. Create one for something that
                matters to you.
              </p>
            ) : (
              <div className="goals-list">
                {goals.map((goal) => {
                  const progress =
                    goal.target > 0
                      ? Math.min(
                          100,
                          (goal.saved / goal.target) * 100,
                        )
                      : 0
                  return (
                    <div
                      className="goal-item"
                      key={goal.id}
                    >
                      <div className="goal-heading">
                        <div>
                          <strong>{goal.name}</strong>
                          <p>
                            {money(goal.saved)} of {money(goal.target)}
                          </p>
                        </div>
                        <button
                          className="cancel-button"
                          type="button"
                          disabled={saving}
                          onClick={() => void deleteGoal(goal.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <div
                        style={{
                          background: '#e9e9ef',
                          height: 8,
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: '#48a99a',
                            borderRadius: 8,
                          }}
                        />
                      </div>
                      <p>{progress.toFixed(0)}% complete</p>
                      {progress < 100 && (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() =>
                            setContributionGoalId(goal.id)
                          }
                        >
                          + Add contribution
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {contributionGoalId && (
              <form
                className="goal-form"
                onSubmit={contributeToGoal}
              >
                <label htmlFor="contribution-amount">
                  Contribution amount (₹)
                </label>
                <input
                  id="contribution-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={contributionAmount}
                  onChange={(event) =>
                    setContributionAmount(event.target.value)
                  }
                  required
                />
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Confirm contribution'}
                </button>
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setContributionGoalId('')}
                >
                  Cancel
                </button>
              </form>
            )}
          </article>
          <article className="panel" id="transactions">
            <div className="panel-heading">
              <div>
                <h3>Transactions</h3>
                <p>All recorded transactions</p>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  setShowTransactionForm((current) => !current)
                }
              >
                {showTransactionForm
                  ? 'Cancel'
                  : '+ Add transaction'}
              </button>
            </div>
            {showTransactionForm && (
              <form
                className="goal-form"
                onSubmit={addTransaction}
              >
                <label htmlFor="tx-name">Transaction name</label>
                <input
                  id="tx-name"
                  value={transactionName}
                  onChange={(event) =>
                    setTransactionName(event.target.value)
                  }
                  required
                  maxLength={80}
                  placeholder="e.g. Groceries"
                />
                <label htmlFor="tx-amount">Amount (₹)</label>
                <input
                  id="tx-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionAmount}
                  onChange={(event) =>
                    setTransactionAmount(event.target.value)
                  }
                  required
                />
                <label htmlFor="tx-type">Type</label>
                <select
                  id="tx-type"
                  value={transactionType}
                  onChange={(event) =>
                    setTransactionType(
                      event.target.value as 'expense' | 'income',
                    )
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                {transactionType === 'expense' && (
                  <>
                    <label htmlFor="tx-category">Category</label>
                    <select
                      id="tx-category"
                      value={transactionCategory}
                      onChange={(event) =>
                        setTransactionCategory(event.target.value)
                      }
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save transaction'}
                </button>
              </form>
            )}
            {transactions.length === 0 ? (
              <p>
                No transactions recorded yet. Add your first entry to
                start understanding your money.
              </p>
            ) : (
              <div className="transactions-list">
                {[...transactions]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((transaction) => (
                    <div
                      className="transaction-row"
                      key={transaction.id}
                    >
                      <div className="transaction-icon">
                        {transaction.icon}
                      </div>
                      <div className="transaction-details">
                        <strong>{transaction.name}</strong>
                        <p>
                          {transaction.category} ·{' '}
                          {dateLabel(transaction.date)}
                        </p>
                      </div>
                      <strong
                        className={
                          transaction.amount >= 0
                            ? 'income-amount'
                            : 'expense-amount'
                        }
                      >
                        {transaction.amount >= 0 ? '+' : '−'}
                        {money(Math.abs(transaction.amount))}
                      </strong>
                      <button
                        className="cancel-button"
                        type="button"
                        disabled={saving}
                        aria-label={`Delete ${transaction.name}`}
                        onClick={() =>
                          void deleteTransaction(transaction.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </article>
        </section>
        <section className="content-grid">
          <article className="panel" id="coach">
            <div className="panel-heading">
              <div>
                <h3>Money coach</h3>
                <p>
                  Practical guidance based on your transactions and
                  savings goals
                </p>
              </div>
            </div>
            <CoachChat
              transactions={transactions}
              goals={goals}
            />
          </article>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <h3>Money check-in</h3>
                <p>Choose whether to allow browser notifications</p>
              </div>
            </div>
            <p>
              A reminder can help you make time to review your
              spending and savings. This prototype sends a test
              notification; it does not schedule background alerts.
            </p>
            {remindersEnabled ? (
              <button
                className="outline-button"
                type="button"
                onClick={disableReminders}
              >
                Turn reminders off
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                onClick={() => void enableReminders()}
              >
                Enable notifications
              </button>
            )}
          </article>
        </section>
        <footer style={{ padding: '28px 0', textAlign: 'center' }}>
          <p>
            Made for your financial wellbeing ✦ Vikasana ·
            Backend-connected prototype
          </p>
        </footer>
      </section>
    </main>
  )
}
export default App
