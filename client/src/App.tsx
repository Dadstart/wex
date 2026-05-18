import { useEffect, useState, type FormEvent } from 'react'
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

function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function App() {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dateTime, setDateTime] = useState(() => toDateTimeLocalValue(new Date()))

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createdTransaction, setCreatedTransaction] = useState<Transaction | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setCreatedTransaction(null)

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
        const problem = (await response.json().catch(() => null)) as ValidationProblem | null
        const apiMessage = problem?.errors
          ? Object.values(problem.errors).flat().join(' ')
          : null
        throw new Error(apiMessage ?? `Request failed (${response.status})`)
      }

      const transaction: Transaction = await response.json()
      setCreatedTransaction(transaction)
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

          {createdTransaction && (
            <p className="success">
              Saved <strong>{createdTransaction.description}</strong> (
              {createdTransaction.purchaseAmount.toFixed(2)} on{' '}
              {new Date(createdTransaction.transactionDate).toLocaleString()}).
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create transaction'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
