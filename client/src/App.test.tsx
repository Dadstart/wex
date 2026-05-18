import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function jsonResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/currencies')) {
          return jsonResponse<string[]>([])
        }
        if (url.includes('/api/transactions')) {
          return jsonResponse([])
        }
        return new Response('not found', { status: 404 })
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the transactions heading', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Transactions' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText(/loading transactions/i)).not.toBeInTheDocument()
    })
  })

  it('shows validation error when description is empty', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.queryByText(/loading transactions/i)).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /create transaction/i }))

    expect(await screen.findByText('Description is required.')).toBeInTheDocument()
  })

  it('lists transactions from the API', async () => {
    const transaction = {
      id: '11111111-1111-1111-1111-111111111111',
      description: 'Coffee',
      transactionDate: '2024-06-15T10:00:00.000Z',
      purchaseAmountUsd: 4.5,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/currencies')) {
          return jsonResponse<string[]>([])
        }
        if (url.includes('/api/transactions')) {
          return jsonResponse([transaction])
        }
        return new Response('not found', { status: 404 })
      }),
    )

    render(<App />)

    expect(await screen.findByText('Coffee')).toBeInTheDocument()
    expect(screen.getByText('$4.50')).toBeInTheDocument()
  })
})
