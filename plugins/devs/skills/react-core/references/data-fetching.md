# Data Fetching

House rules:

- Server data flows through TanStack Query. Components never fetch inside `useEffect`.
- Query data is never copied into local state or a store; derive views with `select`.
- Query definitions live in `src/features/<feature>/api/`.
- Components surface every query through the four canonical component states — loading, empty, error, ready — a contract owned by the react-components skill.
- Auth rides in HttpOnly cookies. The API layer sends credentials; it never reads tokens from JavaScript-accessible storage. See [security.md](./security.md).

## Typed fetch wrapper

Platform `fetch` with a zod schema at the boundary is the API layer. axios is a justified exception (e.g. upload progress events), never the default.

```ts
// src/lib/api.ts
import * as z from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type JsonInit = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: Record<string, string>;
};

export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  init: JsonInit = {},
): Promise<T> {
  const { body, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    credentials: 'include', // HttpOnly cookie auth — no token handling in JS
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  return schema.parse(await res.json());
}
```

Every response passes `schema.parse` before entering the cache: the compiler's view of the data is enforced at runtime, and API drift surfaces as a thrown `ZodError` instead of corrupted UI.

## Feature query modules

`queryOptions` keeps key and function together in one typed, reusable definition; `useQuery`, `useSuspenseQuery`, prefetching, and cache access all infer from it. Let types flow from the `queryFn` — no explicit generics on `useQuery`.

```ts
// src/features/users/api/users.ts
import { queryOptions } from '@tanstack/react-query';
import * as z from 'zod';
import { api } from '@/lib/api';

export const User = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof User>;

export const userQueries = {
  list: () =>
    queryOptions({
      queryKey: ['users'] as const,
      queryFn: () => api('/api/users', z.array(User)),
      staleTime: 60_000, // fresh for 1 min: reads within it hit cache, no refetch
      gcTime: 5 * 60_000, // unused cache entries are dropped after 5 min
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['users', id] as const,
      queryFn: () => api(`/api/users/${id}`, User),
    }),
};
```

`staleTime` is how long data is served from cache without a background refetch; `gcTime` is how long unused entries stay in memory.

## Reading

```tsx
// src/features/users/components/user-list.tsx
import { useQuery } from '@tanstack/react-query';
import { userQueries } from '../api/users';

export function UserList() {
  const query = useQuery({
    ...userQueries.list(),
    select: (users) => [...users].sort((a, b) => a.name.localeCompare(b.name)),
  });

  if (query.isPending) return <p>Loading…</p>;
  if (query.isError) return <p role="alert">{query.error.message}</p>;
  if (query.data.length === 0) return <p>No users yet.</p>;
  return (
    <ul>
      {query.data.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

`select` derives a view of cached data without mutating the cache and without a `useEffect`-plus-`useState` copy. The query result is a discriminated union: keep the `query` object intact and, after the `isPending` and `isError` branches return, `query.data` is narrowed to defined.

## Writing

```ts
// src/features/users/api/create-user.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { api } from '@/lib/api';
import { User } from './users';

export const NewUser = z.object({ name: z.string().min(1), email: z.email() });
export type NewUser = z.infer<typeof NewUser>;

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewUser) =>
      api('/api/users', User, { method: 'POST', body: NewUser.parse(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
```

Invalidate-on-success is the default consistency strategy: run the mutation, invalidate the affected key prefix, and let active queries refetch themselves.

## Suspense

`useSuspenseQuery` takes the same `queryOptions` and returns `data` non-nullable, delegating loading and errors to the nearest `Suspense` and error boundary:

```tsx
// src/features/users/components/user-name.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { userQueries } from '../api/users';

export function UserName({ id }: { id: string }) {
  const { data } = useSuspenseQuery(userQueries.detail(id)); // data: User, never undefined
  return <span>{data.name}</span>;
}
```

For error modelling beyond `ApiError`, see the typescript-core skill's error-handling reference.
