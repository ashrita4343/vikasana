
import { useId, useMemo, useRef, useState } from 'react'
import './CoachChat.css'

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

type Props = {
  transactions: Transaction[]
  goals: Goal[]
}

type ChatMessage = {
  id: string
  role: 'user' | 'coach'
  text: string
}

const money = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`

const starters = [
  'How am I spending?',
  'Help me save money',
  'How are my goals doing?',
  'Can I afford a purchase?',
]

function buildReply(
  question: string,
  transactions: Transaction[],
  goals: Goal[],
): string {
  const q = question.toLowerCase()

  const expenses = transactions.filter((t) => t.amount < 0)
  const income = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = expenses.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0,
  )

  const cashFlow = income - totalExpenses

  const categoryTotals = expenses.reduce<Record<string, number>>(
    (totals, transaction) => {
      totals[transaction.category] =
        (totals[transaction.category] || 0) +
        Math.abs(transaction.amount)

      return totals
    },
    {},
  )

  const topCategory = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  )[0]

  if (
    q.includes('hello') ||
    q.includes('hi') ||
    q.includes('hey')
  ) {
    return 'Hey! 👋 I’m your Vikasana money coach. Ask me about your recorded spending, savings goals, or ways to plan your next financial step. No judgement here—just practical guidance.'
  }

  if (
    q.includes('goal') ||
    q.includes('saving goal') ||
    q.includes('progress')
  ) {
    if (goals.length === 0) {
      return 'You haven’t created a savings goal yet. Try starting with something meaningful, such as an emergency fund, a course, or a future trip. Choose a target that feels manageable.'
    }

    const details = goals
      .map((goal) => {
        const progress =
          goal.target > 0
            ? Math.min(100, (goal.saved / goal.target) * 100)
            : 0

        return `${goal.name}: ${money(goal.saved)} of ${money(goal.target)} saved (${progress.toFixed(0)}%).`
      })
      .join('\n')

    return `Here’s your current goal progress:\n\n${details}\n\nSmall, consistent contributions can help. Only contribute what remains comfortable after essential expenses.`
  }

  if (
    q.includes('spend') ||
    q.includes('expense') ||
    q.includes('where') ||
    q.includes('category')
  ) {
    if (expenses.length === 0) {
      return 'I don’t have any recorded expenses to analyse yet. Add a few transactions first, and I can help identify patterns in the information you enter.'
    }

    const breakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => `${category}: ${money(amount)}`)
      .join('\n')

    return `Based on your ${expenses.length} recorded expense(s), your total expenses are ${money(totalExpenses)}.\n\nYour biggest categories are:\n${breakdown}\n\nYour largest category is ${topCategory?.[0]}. Review whether those expenses reflect your needs and priorities before deciding what, if anything, to change.`
  }

  if (
    q.includes('save') ||
    q.includes('saving') ||
    q.includes('savings')
  ) {
    if (income === 0 && totalExpenses === 0) {
      return 'Let’s start small. Record your income and a few expenses so we can work from your actual numbers. Then choose a realistic savings target that doesn’t put essentials at risk.'
    }

    if (cashFlow <= 0) {
      return `Your recorded income is ${money(income)} and your recorded expenses are ${money(totalExpenses)}. That leaves ${money(cashFlow)} in recorded cash flow.\n\nRather than forcing a savings target, first check whether all income and essential expenses have been recorded. Then look for a small, safe adjustment if one is available.`
    }

    const suggestion = Math.max(
      0,
      Math.round(Math.min(cashFlow * 0.2, cashFlow)),
    )

    return `Your recorded income is ${money(income)} and expenses are ${money(totalExpenses)}, leaving ${money(cashFlow)} in recorded cash flow.\n\nOne possible starting point is to explore setting aside up to ${money(suggestion)}. This is only an illustration—not a recommendation to transfer money. Account for upcoming bills, debt payments, and emergency needs first.`
  }

  if (
    q.includes('afford') ||
    q.includes('purchase') ||
    q.includes('buy') ||
    q.includes('spend on')
  ) {
    const amountMatch = q.match(/(?:₹|rs\.?\s*)(\d+(?:,\d{3})*(?:\.\d+)?)/i)

    const amount = amountMatch
      ? Number(amountMatch[1].replace(/,/g, ''))
      : null

    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      return 'Tell me the approximate price of the purchase (for example, “Can I afford ₹2,000?”). I can compare it with your recorded cash flow, but we should also consider upcoming bills, debt, and emergency savings.'
    }

    if (cashFlow <= 0) {
      return `Your recorded cash flow is ${money(cashFlow)}, so your entries don’t currently show a positive surplus. Before making a non-essential purchase of ${money(amount)}, review upcoming bills and available account balances. Your recorded transactions may not show your complete financial situation.`
    }

    if (amount > cashFlow) {
      return `The purchase costs ${money(amount)}, while your recorded cash flow is ${money(cashFlow)}. It exceeds that recorded surplus by ${money(amount - cashFlow)}. Consider waiting, choosing a lower-cost option, or checking your full budget before deciding.`
    }

    return `The purchase costs ${money(amount)}, compared with ${money(cashFlow)} in recorded cash flow. That means it is less than your recorded surplus, but it doesn’t automatically mean it is affordable. Check upcoming essentials, debt payments, and emergency savings before deciding.`
  }

  if (
    q.includes('budget') ||
    q.includes('cash flow') ||
    q.includes('income')
  ) {
    return `Here is a summary of your recorded transactions:\n\nIncome: ${money(income)}\nExpenses: ${money(totalExpenses)}\nNet cash flow: ${money(cashFlow)}\n\n${cashFlow >= 0 ? 'Your recorded income is at least as high as your recorded expenses.' : 'Your recorded expenses exceed your recorded income.'} These figures only include transactions entered in Vikasana, so they may not reflect your full finances.`
  }

  if (
    q.includes('debt') ||
    q.includes('loan') ||
    q.includes('emi') ||
    q.includes('interest')
  ) {
    return 'Start by listing each debt’s outstanding balance, interest rate, minimum payment, and due date. Keep essential bills and minimum payments covered. Paying extra toward a high-interest debt can reduce interest costs, but keep enough cash for urgent needs. I can help organise the numbers you provide.'
  }

  if (
    q.includes('invest') ||
    q.includes('stock') ||
    q.includes('mutual fund') ||
    q.includes('crypto')
  ) {
    return 'Before investing, consider essential expenses, high-interest debt, emergency savings, your time horizon, and your ability to tolerate losses. Investments can lose value, and no return is guaranteed. I can explain general concepts, but I can’t determine which investment is suitable for you from these transactions alone.'
  }

  return 'I’m here to help you understand your money without judgement. Try asking about your spending, savings goals, budget, debt, or whether a purchase fits your recorded cash flow. I use the information entered in Vikasana, which may not represent your complete financial situation.'
}

export default function CoachChat({ transactions, goals }: Props) {
  const messageIdPrefix = useId()
  const messageCounter = useRef(0)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: `${messageIdPrefix}-welcome`,
      role: 'coach',
      text: 'Hi! 🌱 I’m your Vikasana money coach. I can help you explore your recorded spending, plan savings, and think through financial decisions. What would you like to work on?',
    },
  ])

  const [busy, setBusy] = useState(false)

  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return { income, expenses, cashFlow: income - expenses }
  }, [transactions])

  function sendMessage(text = input) {
    const question = text.trim()

    if (!question || busy) return

    const userMessage: ChatMessage = {
      id: `${messageIdPrefix}-${++messageCounter.current}`,
      role: 'user',
      text: question,
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setBusy(true)

    // Local, rule-based responses; no external AI service is called.
    window.setTimeout(() => {
      const reply = buildReply(question, transactions, goals)

      setMessages((current) => [
        ...current,
        {
          id: `${messageIdPrefix}-${++messageCounter.current}`,
          role: 'coach',
          text: reply,
        },
      ])

      setBusy(false)
    }, 250)
  }

  return (
    <section className="coach-chat" aria-label="Vikasana money coach">
      <header className="coach-chat-header">
        <div className="coach-avatar" aria-hidden="true">✳</div>

        <div>
          <h3>Your money coach</h3>
          <p>Practical guidance, at your pace</p>
        </div>

        <span className="coach-status">Ready</span>
      </header>

      <div className="coach-summary">
        <div>
          <span>Recorded income</span>
          <strong>{money(summary.income)}</strong>
        </div>

        <div>
          <span>Recorded expenses</span>
          <strong>{money(summary.expenses)}</strong>
        </div>

        <div>
          <span>Cash flow</span>
          <strong>{money(summary.cashFlow)}</strong>
        </div>
      </div>

      <div className="coach-messages" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`coach-message ${message.role}`}
          >
            <span className="message-label">
              {message.role === 'coach' ? 'Vikasana' : 'You'}
            </span>

            <p>{message.text}</p>
          </div>
        ))}

        {busy && (
          <div className="coach-typing" role="status">
            Thinking through your question…
          </div>
        )}
      </div>

      <div className="coach-starters">
        <p>Not sure where to start?</p>

        <div className="coach-starter-buttons">
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => sendMessage(starter)}
              disabled={busy}
            >
              {starter}
            </button>
          ))}
        </div>
      </div>

      <form
        className="coach-input-form"
        onSubmit={(event) => {
          event.preventDefault()
          sendMessage()
        }}
      >
        <label className="visually-hidden" htmlFor="coach-question">
          Ask your money coach
        </label>

        <input
          id="coach-question"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about spending, saving, or a purchase…"
          maxLength={500}
          disabled={busy}
        />

        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>

      <p className="coach-disclaimer">
        Guidance is based on transactions you enter, not verified bank
        data. Responses are rule-based and educational, not personalised
        investment, tax, or legal advice.
      </p>
    </section>
  )
}
