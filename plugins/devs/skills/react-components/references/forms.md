# Forms

React Hook Form + Zod. All validation lives in the schema — the form element gets `noValidate` so the schema is the single source of truth, and rules are never duplicated in HTML validation attributes. Views stay pure ([patterns.md](patterns.md)); the form component owns the wiring shown here.

## File Convention

```
src/features/<feature>/
├─ forms/
│  ├─ <name>-schema.ts        # Zod schema + inferred types
│  └─ use-<name>-form.ts      # useForm hook wired to the schema
└─ components/
   └─ <Name>Form.tsx          # the form component
```

## Schema

```ts
// src/features/orders/forms/create-order-schema.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  email: z.email("Enter a valid email"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero"),
});

export type CreateOrderValues = z.infer<typeof createOrderSchema>;
```

Format validators are top-level Zod functions (`z.email()`, `z.url()`, `z.uuid()`), not string methods.

## Hook

```ts
// src/features/orders/forms/use-create-order-form.ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createOrderSchema } from "./create-order-schema";
import type { CreateOrderValues } from "./create-order-schema";

export function useCreateOrderForm() {
  return useForm<CreateOrderValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { email: "", amount: "" },
  });
}
```

`zodResolver` plus the `useForm` generic gives a fully typed form: `register` only accepts real field names, and `handleSubmit` passes the submit handler already-validated values.

## Component: Typed Submit + Server Errors

```tsx
// src/features/orders/components/CreateOrderForm.tsx
import type { SubmitHandler } from "react-hook-form";
import { ApiValidationError } from "@/lib/api-errors";
import { createOrderSchema } from "../forms/create-order-schema";
import type { CreateOrderValues } from "../forms/create-order-schema";
import { useCreateOrderForm } from "../forms/use-create-order-form";

interface CreateOrderFormProps {
  onSubmit: (values: CreateOrderValues) => Promise<void>;
}

const fieldNames = Object.keys(createOrderSchema.shape) as Array<keyof CreateOrderValues>;

export function CreateOrderForm({ onSubmit }: CreateOrderFormProps) {
  const { register, handleSubmit, setError, formState } = useCreateOrderForm();
  const { errors, isSubmitting } = formState;

  const submit: SubmitHandler<CreateOrderValues> = async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiValidationError) {
        for (const field of fieldNames) {
          const message = error.fieldErrors[field];
          if (message) setError(field, { type: "server", message });
        }
      } else {
        setError("root.server", { message: "Order failed. Please try again." });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <label htmlFor="order-email">Email</label>
      <input
        id="order-email"
        type="email"
        aria-invalid={errors.email ? true : undefined}
        aria-describedby={errors.email ? "order-email-error" : undefined}
        {...register("email")}
      />
      {errors.email && (
        <p id="order-email-error" role="alert">
          {errors.email.message}
        </p>
      )}

      {errors.root?.["server"] && <p role="alert">{errors.root["server"].message}</p>}

      <button type="submit" disabled={isSubmitting}>
        Create order
      </button>
    </form>
  );
}
```

`ApiValidationError` is the API client's typed wrapper for validation responses:

```ts
// src/lib/api-errors.ts — thin wrapper the API client throws for 422 responses
export class ApiValidationError extends Error {
  constructor(readonly fieldErrors: Partial<Record<string, string>>) {
    super("Validation failed");
    this.name = "ApiValidationError";
  }
}
```

The load-bearing details:

- The handler is `SubmitHandler<CreateOrderValues>` and only runs after the schema passes — it never sees unvalidated input. The `<form>` handler is `handleSubmit(submit)`, nothing hand-rolled.
- Server field errors map into form state with `setError(field, { type: "server", message })`, so they render exactly like client validation errors. Non-field failures go to `root.server`; root errors clear on the next submit attempt.
- Accessible errors: `aria-invalid` marks the field, `aria-describedby` links the message to it, and `role="alert"` announces it — the floor from [accessibility.md](accessibility.md).

## Testing

Drive forms through `userEvent` (type, submit, assert the visible error) — mechanics such as `userEvent.setup()` and query rules live in the typescript-core testing reference.
