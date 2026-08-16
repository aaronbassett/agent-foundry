# Headless Components

A headless component keeps behaviour — state, keyboard handling, ARIA wiring — in a hook and leaves rendering to the consumer. The hook returns state plus prop getters; the consumer spreads those onto real elements. Same logic, any presentation.

Semantics are part of the behaviour, not the presentation. Prop getters attach the correct roles to the correct elements: the trigger is a real `<button>`, options are `role="option"` inside a `role="listbox"`, and options are never tabbable — the listbox itself holds DOM focus and points at the active option with `aria-activedescendant`. A consumer can restyle everything; they cannot accidentally break the semantics.

## The House Dropdown

One coherent unit: hook, component, and tests that pass against them. The keyboard contract: `ArrowDown`/`ArrowUp` open from the trigger and move the highlight in the list, `Enter`/`Space` select the highlighted option, `Escape` closes — and closing always returns focus to the trigger.

```tsx
// src/components/ui/dropdown/use-dropdown.ts
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface UseDropdownProps {
  options: readonly DropdownOption[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function useDropdown({ options, defaultValue, onValueChange }: UseDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(defaultValue ?? null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const open = useCallback(() => {
    const selected = options.findIndex((option) => option.value === selectedValue);
    setHighlightedIndex(selected === -1 ? 0 : selected);
    setIsOpen(true);
  }, [options, selectedValue]);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const select = useCallback(
    (value: string) => {
      setSelectedValue(value);
      onValueChange?.(value);
      close();
    },
    [close, onValueChange],
  );

  useEffect(() => {
    if (isOpen) listboxRef.current?.focus();
  }, [isOpen]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
    }
  };

  const onListboxKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const highlighted = options[highlightedIndex];
        if (highlighted) select(highlighted.value);
        break;
      }
      case "Escape":
        event.preventDefault();
        close();
        break;
    }
  };

  return {
    isOpen,
    selectedValue,
    highlightedValue: options[highlightedIndex]?.value ?? null,
    open,
    close,
    select,
    getTriggerProps: () => ({
      ref: triggerRef,
      type: "button" as const,
      "aria-haspopup": "listbox" as const,
      "aria-expanded": isOpen,
      "aria-controls": isOpen ? listboxId : undefined,
      onClick: isOpen ? close : open,
      onKeyDown: onTriggerKeyDown,
    }),
    getListboxProps: () => ({
      ref: listboxRef,
      id: listboxId,
      role: "listbox" as const,
      tabIndex: -1,
      "aria-activedescendant": optionId(highlightedIndex),
      onKeyDown: onListboxKeyDown,
    }),
    getOptionProps: (option: DropdownOption, index: number) => ({
      id: optionId(index),
      role: "option" as const,
      "aria-selected": option.value === selectedValue,
      "data-highlighted": index === highlightedIndex ? "" : undefined,
      onClick: () => {
        select(option.value);
      },
    }),
  };
}

export type UseDropdownReturn = ReturnType<typeof useDropdown>;
```

`ref` is a regular prop, so the getters hand refs straight to the elements they target, and the hook manages focus (into the listbox on open, back to the trigger on close) without wrapper components.

```tsx
// src/components/ui/dropdown/Dropdown.tsx
import { useDropdown } from "./use-dropdown";
import type { UseDropdownProps } from "./use-dropdown";

interface DropdownProps extends UseDropdownProps {
  label: string;
}

export function Dropdown({ label, options, defaultValue, onValueChange }: DropdownProps) {
  const dropdown = useDropdown({ options, defaultValue, onValueChange });
  const selected = options.find((option) => option.value === dropdown.selectedValue);

  return (
    <div>
      <button {...dropdown.getTriggerProps()}>{selected?.label ?? label}</button>
      {dropdown.isOpen && (
        <ul {...dropdown.getListboxProps()} aria-label={label}>
          {options.map((option, index) => (
            <li key={option.value} {...dropdown.getOptionProps(option, index)}>
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

These tests pass against the code above. Runner mechanics live in the typescript-core testing reference; one wiring note — Testing Library's automatic cleanup between tests requires `globals: true` in the vitest config.

```tsx
// src/components/ui/dropdown/Dropdown.test.tsx
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dropdown } from "./Dropdown";
import { useDropdown } from "./use-dropdown";

const options = [
  { value: "eth", label: "Ethereum" },
  { value: "sol", label: "Solana" },
];

describe("useDropdown", () => {
  it("selects a value and closes", () => {
    const { result } = renderHook(() => useDropdown({ options }));

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.select("sol"));
    expect(result.current.selectedValue).toBe("sol");
    expect(result.current.isOpen).toBe(false);
  });
});

describe("Dropdown", () => {
  it("opens on click and moves focus to the listbox", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Network" options={options} />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Network" }));

    expect(screen.getByRole("listbox", { name: "Network" })).toHaveFocus();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("navigates with arrows and selects with Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Dropdown label="Network" options={options} onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button", { name: "Network" });

    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("sol");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solana" })).toHaveFocus();
  });

  it("highlights via aria-activedescendant, not DOM focus", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Network" options={options} defaultValue="sol" />);

    await user.click(screen.getByRole("button", { name: "Solana" }));

    const listbox = screen.getByRole("listbox");
    const highlighted = screen.getByRole("option", { name: "Solana" });
    expect(listbox).toHaveAttribute("aria-activedescendant", highlighted.id);
    expect(highlighted).toHaveAttribute("data-highlighted");
    expect(highlighted).toHaveAttribute("aria-selected", "true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Network" options={options} />);
    const trigger = screen.getByRole("button", { name: "Network" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
```

The role-based queries double as a semantics check: if `getByRole("listbox", { name: "Network" })` finds nothing, the markup is wrong ([accessibility.md](accessibility.md)).

## Radix-Style Composition

Multi-part components share the behaviour through context instead of prop getters. The rules: render the Context directly as the provider; keep the value referentially stable with `useMemo`; accept `ref` as a regular prop; offer `asChild` via the `radix-ui` `Slot` so consumers substitute their own element; and expose state as `data-*` attributes so styling never needs to reach into internals.

```tsx
import { Slot } from "radix-ui";
import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode, Ref } from "react";

interface DisclosureContextValue {
  isOpen: boolean;
  toggle: () => void;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

function useDisclosureContext(): DisclosureContextValue {
  const context = use(DisclosureContext);
  if (!context) throw new Error("Disclosure.* must be used inside <Disclosure.Root>");
  return context;
}

function DisclosureRoot({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((open) => !open), []);
  const value = useMemo(() => ({ isOpen, toggle }), [isOpen, toggle]);

  return <DisclosureContext value={value}>{children}</DisclosureContext>;
}

interface DisclosureTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

function DisclosureTrigger({ children, asChild = false, ref }: DisclosureTriggerProps) {
  const { isOpen, toggle } = useDisclosureContext();
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp ref={ref} data-state={isOpen ? "open" : "closed"} aria-expanded={isOpen} onClick={toggle}>
      {children}
    </Comp>
  );
}

function DisclosureContent({ children }: { children: ReactNode }) {
  const { isOpen } = useDisclosureContext();
  return isOpen ? <div data-state="open">{children}</div> : null;
}

export const Disclosure = {
  Root: DisclosureRoot,
  Trigger: DisclosureTrigger,
  Content: DisclosureContent,
};
```

Style off the data attributes:

```css
[data-state="open"] > .chevron {
  rotate: 180deg;
}
```

Usage — `asChild` merges the trigger behaviour into the consumer's element instead of rendering a nested button:

```tsx
<Disclosure.Root>
  <Disclosure.Trigger asChild>
    <MyFancyButton>Details</MyFancyButton>
  </Disclosure.Trigger>
  <Disclosure.Content>…</Disclosure.Content>
</Disclosure.Root>
```

## Build Headless vs Reach for Radix / React Aria

Default to an existing primitive: if the interaction pattern has a name in the Radix or React Aria catalogue (dialog, popover, select, tabs, tooltip…), use theirs — overlay positioning, focus trapping, typeahead, and screen-reader quirks are deep and already solved, per the UI source priority in [patterns.md](patterns.md). Build headless only when the interaction is domain-specific (no primitive models it) or when one piece of house behaviour genuinely needs several presentations. Which packages are approved is owned by the react-core packages reference — this file only covers how to build, not what to install.
