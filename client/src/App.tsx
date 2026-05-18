import { useEffect, useState, type SubmitEvent } from 'react'
import './App.css'

type Transaction = {
  id: string
  description: string
  transactionDate: string
  purchaseAmountUsd: number
  targetCurrency?: string | null
  exchangeRate?: number | null
  convertedAmount?: number | null
}

type ValidationProblem = {
  errors?: Record<string, string[]>
  title?: string
  detail?: string
}

const usdFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

function formatConverted(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

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

function problemMessage(problem: ValidationProblem | null, status: number): string {
  if (problem?.errors) {
    return Object.values(problem.errors).flat().join(' ')
  }
  return problem?.title ?? problem?.detail ?? `Request failed (${status})`
}

function App() {
  const [currencies, setCurrencies] = useState<string[]>([])
  const [targetCurrency, setTargetCurrency] = useState('')

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

    async function loadCurrencies() {
      try {
        const response = await fetch('/api/currencies')
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        const data = await readJsonResponse<string[]>(response)
        if (!cancelled) {
          setCurrencies(data)
        }
      } catch (err) {
        if (!cancelled) {
          setTransactionsError(
            err instanceof Error ? err.message : 'Failed to load currencies',
          )
        }
      }
    }

    void loadCurrencies()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTransactions() {
      try {
        const params = targetCurrency
          ? `?currency=${encodeURIComponent(targetCurrency)}`
          : ''
        const response = await fetch(`/api/transactions${params}`)
        if (!response.ok) {
          const problem = await readJsonResponse<ValidationProblem>(response).catch(
            () => null,
          )
          throw new Error(problemMessage(problem, response.status))
        }
        const data = await readJsonResponse<Transaction[]>(response)
        if (!cancelled) {
          setTransactions(data)
        }
      } catch (err) {
        if (!cancelled) {
          setTransactions([])
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
  }, [targetCurrency])

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
        throw new Error(problemMessage(problem, response.status))
      }

      if (targetCurrency) {
        const listResponse = await fetch(
          `/api/transactions?currency=${encodeURIComponent(targetCurrency)}`,
        )
        if (!listResponse.ok) {
          const problem = await readJsonResponse<ValidationProblem>(listResponse).catch(
            () => null,
          )
          throw new Error(problemMessage(problem, listResponse.status))
        }
        setTransactions(await readJsonResponse<Transaction[]>(listResponse))
      } else {
        const transaction = await readJsonResponse<Transaction>(response)
        setTransactions((current) =>
          [transaction, ...current].sort(
            (a, b) =>
              new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
          ),
        )
      }
      setDescription('')
      setAmount('')
      setDateTime(toDateTimeLocalValue(new Date()))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create transaction')
    } finally {
      setSubmitting(false)
    }
  }

  const showConversion = Boolean(targetCurrency)

  return (
    <main className="app">
      <header>
        <p className="eyebrow">Wex</p>
        <h1>Transactions</h1>
        <p className="lede">
          Record purchases in USD and view amounts converted using U.S. Treasury reporting
          rates.
        </p>
      </header>

      <section className="panel currency-panel">
        <label className="field currency-field">
          <span>Display currency</span>
          <select
            value={targetCurrency}
            onChange={(e) => {
              setTargetCurrency(e.target.value)
              setTransactionsLoading(true)
              setTransactionsError(null)
            }}
            disabled={transactionsLoading && currencies.length === 0}
          >
            <option value="">USD only</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </section>

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
                  <th scope="col" className="col-description">
                    Description
                  </th>
                  <th scope="col" className="col-date">
                    Date & time
                  </th>
                  <th scope="col" className="amount-col">
                    USD amount
                  </th>
                  {showConversion && (
                    <>
                      <th scope="col" className="amount-col">
                        Exchange rate
                      </th>
                      <th scope="col" className="amount-col">
                        {targetCurrency}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="col-description">{transaction.description}</td>
                    <td className="col-date">
                      {new Date(transaction.transactionDate).toLocaleString()}
                    </td>
                    <td className="amount-col">
                      {usdFormatter.format(transaction.purchaseAmountUsd)}
                    </td>
                    {showConversion && (
                      <>
                        <td className="amount-col">
                          {transaction.exchangeRate?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </td>
                        <td className="amount-col">
                          {transaction.convertedAmount != null && transaction.targetCurrency
                            ? formatConverted(
                                transaction.convertedAmount,
                                transaction.targetCurrency,
                              )
                            : '—'}
                        </td>
                      </>
                    )}
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
            <span>Amount (USD)</span>
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
