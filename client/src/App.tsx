import { useEffect, useState, type SubmitEvent } from 'react'
import './App.css'

type Transaction = {
  id: string
  description: string
  transactionDate: string
  purchaseAmount: number
}

type ValidationProblem = {
  errors?: Record<string, string[]>
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const body = await response.text()
    if (body.trimStart().toLowerCase().startsWith('<!doctype')) {
      throw new Error(
        'API returned HTML instead of JSON. Start the backend with: dotnet run --project server',
      )
    }
    throw new Error(body || `Unexpected response (${response.status})`)
  }
  return response.json() as Promise<T>
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dateTime, setDateTime] = useState(() => toDateTimeLocalValue(new Date()))

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTransactions() {
      try {
        const response = await fetch('/api/transactions')
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        const data = await readJsonResponse<Transaction[]>(response)
        if (!cancelled) {
          setTransactions(data)
          setTransactionsError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setTransactionsError(
            err instanceof Error ? err.message : 'Failed to load transactions',
          )
        }
      } finally {
        if (!cancelled) {
          setTransactionsLoading(false)
        }
      }
    }

    void loadTransactions()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setFormError('Description is required.')
      return
    }
    if (trimmedDescription.length > 50) {
      setFormError('Description must be 50 characters or less.')
      return
    }

    const parsedAmount = Number(amount)
    if (amount === '' || Number.isNaN(parsedAmount)) {
      setFormError('Amount must be a valid number.')
      return
    }

    if (!dateTime) {
      setFormError('Date and time are required.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: trimmedDescription,
          date: new Date(dateTime).toISOString(),
          amount: parsedAmount,
        }),
      })

      if (!response.ok) {
        const problem = await readJsonResponse<ValidationProblem>(response).catch(
          () => null,
        )
        const apiMessage = problem?.errors
          ? Object.values(problem.errors).flat().join(' ')
          : null
        throw new Error(apiMessage ?? `Request failed (${response.status})`)
      }

      const transaction = await readJsonResponse<Transaction>(response)
      setTransactions((current) =>
        [transaction, ...current].sort(
          (a, b) =>
            new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
        ),
      )
      setDescription('')
      setAmount('')
      setDateTime(toDateTimeLocalValue(new Date()))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create transaction')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="app">
      <header>
        <p className="eyebrow">Wex</p>
        <h1>Transactions</h1>
        <p className="lede">Record a purchase against the API-backed database.</p>
      </header>

      <section className="panel">
        <h2>All transactions</h2>
        {transactionsLoading && <p>Loading transactions…</p>}
        {transactionsError && <p className="error">{transactionsError}</p>}
        {!transactionsLoading && !transactionsError && transactions.length === 0 && (
          <p className="empty">No transactions yet.</p>
        )}
        {!transactionsLoading && !transactionsError && transactions.length > 0 && (
          <div className="table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">Date & time</th>
                  <th scope="col" className="amount-col">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.description}</td>
                    <td>{new Date(transaction.transactionDate).toLocaleString()}</td>
                    <td className="amount-col">
                      {currencyFormatter.format(transaction.purchaseAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>New transaction</h2>
        <form className="transaction-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Description</span>
            <input
              type="text"
              name="description"
              maxLength={50}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Coffee"
              disabled={submitting}
            />
          </label>

          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
            />
          </label>

          <label className="field">
            <span>Date & time</span>
            <input
              type="datetime-local"
              name="dateTime"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              disabled={submitting}
            />
          </label>

          {formError && <p className="error">{formError}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create transaction'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
