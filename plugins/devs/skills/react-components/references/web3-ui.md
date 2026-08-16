# Web3 UI Patterns

Relevant only when the project touches wallets, chains, or tokens — general web security (XSS, URL validation, storage, logging) lives in the react-core skill's security reference. Snippets compile under strict TypeScript against installed ethers and wagmi.

## Address handling

Validate and normalize with chain utilities, never regex. `getAddress` returns the EIP-55 checksummed form and throws on invalid input; compare addresses only after checksumming.

```ts
import { getAddress, isAddress } from 'ethers'

export function truncateAddress(address: string): string {
  const checksummed = getAddress(address) // throws on invalid input
  return `${checksummed.slice(0, 6)}…${checksummed.slice(-4)}`
}

export function isSameAddress(a: string, b: string): boolean {
  return isAddress(a) && isAddress(b) && getAddress(a) === getAddress(b)
}
```

Truncate for display only when the full address stays reachable — a tooltip, a copy button. Never take "your address" from props or the URL; read it from the connected wallet.

## Token amounts

Token math is `bigint` only. JavaScript `number` corrupts values beyond 2^53 — 18-decimal amounts pass that constantly. Floats never touch an amount; strings are for user input and serialization.

```ts
import { formatUnits, parseUnits } from 'ethers'

export function formatTokenAmount(amount: bigint, decimals: number, maxFractionDigits = 4): string {
  const [whole = '0', fraction = ''] = formatUnits(amount, decimals).split('.')
  const grouped = BigInt(whole).toLocaleString('en-US')
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, '')
  return trimmed ? `${grouped}.${trimmed}` : grouped
}

parseUnits('1.5', 18) // 1500000000000000000n
formatTokenAmount(parseUnits('1.5', 18), 18) // '1.5'
formatTokenAmount(parseUnits('1234.5678', 6), 6, 2) // '1,234.56'
```

`parseUnits` converts user input to base units; `formatUnits` converts back. Multiply before dividing to keep precision, and guard every division against `0n`.

## Approvals

Request the explicit amount the action needs. Unlimited approval is a real risk transfer — if the spender is compromised, every future token is exposed — so it must be an informed opt-in, never the default.

```tsx
import { MaxUint256 } from 'ethers'
import { useState, type ReactElement } from 'react'

import { formatTokenAmount } from './amounts'

interface ApprovalAmountProps {
  symbol: string
  decimals: number
  requiredAmount: bigint
  onApprove: (amount: bigint) => void
}

export function ApprovalAmount(props: ApprovalAmountProps): ReactElement {
  const { symbol, decimals, requiredAmount, onApprove } = props
  const [unlimited, setUnlimited] = useState(false)

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        onApprove(unlimited ? MaxUint256 : requiredAmount)
      }}
    >
      <p>
        Approve {unlimited ? 'unlimited' : formatTokenAmount(requiredAmount, decimals)} {symbol}
      </p>
      <label>
        <input
          type="checkbox"
          checked={unlimited}
          onChange={event => setUnlimited(event.target.checked)}
        />
        Unlimited — the spender can move any future {symbol} without asking again
      </label>
      <button type="submit">Approve</button>
    </form>
  )
}
```

## Wallet state

wagmi's `useConnection` returns a discriminated union on `status` (`connected | connecting | reconnecting | disconnected`) — the same shape as the house four-state view contract, so narrow on `status` before touching `address`. Mutations follow TanStack Query conventions: `mutate`/`isPending`.

```tsx
import type { ReactElement } from 'react'
import { useConnect, useConnection, useConnectors, useDisconnect } from 'wagmi'

import { truncateAddress } from './address'

export function WalletStatus(): ReactElement {
  const connection = useConnection()
  const { mutate: connect, isPending } = useConnect()
  const { mutate: disconnect } = useDisconnect()
  const [connector] = useConnectors()

  if (connection.status === 'connected') {
    return (
      <button type="button" onClick={() => disconnect()}>
        {truncateAddress(connection.address)}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={isPending || connector === undefined}
      onClick={() => connector && connect({ connector })}
    >
      {isPending ? 'Connecting…' : 'Connect wallet'}
    </button>
  )
}
```

## Secret display

Seed phrases and private keys render masked by default, revealed only on explicit action, inside a `<form>` that calls `preventDefault` when input is involved. Never log them, never put them in localStorage, and keep them out of long-lived state — prefer leaving custody with the wallet entirely.

Be honest about cleanup: JavaScript strings are immutable and garbage-collected, so no unmount effect can scrub a secret from memory — clearing state on unmount only drops references. Clipboard expiry is likewise best effort:

```tsx
async function copyWithExpiry(): Promise<void> {
  await navigator.clipboard.writeText(phrase)
  setCopied(true)
  setTimeout(() => {
    // Best effort: overwrites the clipboard only while this tab is alive
    // and focused. It cannot reach clipboard managers or other devices.
    navigator.clipboard.writeText('').catch(() => undefined)
    setCopied(false)
  }, 30_000)
}
```

Tell the user what the expiry does and does not cover — silent "security" that quietly fails is worse than none.
