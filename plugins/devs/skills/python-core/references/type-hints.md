# Type Hints

Targets 3.12+; everything here passes `mypy --strict` (mypy 2.3.1) on 3.14. Write `X | None`, lowercase builtin generics (`list[str]`, `dict[str, int]`), and PEP 695 syntax. The pre-3.12 spellings — `Optional`/`Union`, capital-letter container aliases imported from `typing`, manual `TypeVar` + `Generic` base classes — are legacy; don't write them, and let ruff's `UP` rules (pyupgrade) auto-migrate them on sight.

## Generics and aliases (PEP 695)

Type parameters are declared inline; no `TypeVar` boilerplate, and `type` aliases are lazily evaluated (forward references just work).

```python
type Pair[T] = tuple[T, T]          # lazily evaluated; forward refs just work

class Box[T]:
    def __init__(self, item: T) -> None:
        self.item = item

    def get(self) -> T:
        return self.item

def first[T](items: list[T]) -> T:
    return items[0]

def total[N: (int, float)](xs: list[N]) -> N:   # constrained
    return max(xs)
```

Bound: `[T: Hashable]`. Variance is inferred — never declared.

## Self and @override

```python
from typing import Self, override

class Builder:
    def add(self, part: str) -> Self:    # subclass chains keep the subclass type
        return self

class Loud(Builder):
    @override                            # flags a typo'd/renamed base method
    def add(self, part: str) -> Self:
        return super().add(part)
```

Enable `explicit-override` (config below) to require the decorator.

## TypeIs vs TypeGuard

`TypeIs` (3.13+) narrows **both** branches; `TypeGuard` only the positive one. Prefer `TypeIs` whenever the narrowed type is a subtype of the input — reach for `TypeGuard` only for non-subtype rewrites like `list[object]` → `list[str]`.

```python
from typing import TypeIs, reveal_type

def is_str(x: object) -> TypeIs[str]:
    return isinstance(x, str)

def handle(x: int | str) -> None:
    if is_str(x):
        reveal_type(x)   # str
    else:
        reveal_type(x)   # int — TypeIs narrows BOTH branches
```

mypy output: `Revealed type is "str"` / `Revealed type is "int"`.

## Structural + data shapes

```python
from typing import Annotated, Literal, NotRequired, Protocol, ReadOnly, TypedDict

class Closable(Protocol):            # structural: no inheritance needed
    def close(self) -> None: ...

class User(TypedDict):
    id: ReadOnly[int]                # checker rejects mutation
    name: str
    email: NotRequired[str]

type Mode = Literal["r", "w", "a"]

PositiveInt = Annotated[int, "gt=0"]   # metadata Pydantic/FastAPI consume
```

`Protocol` for duck-typed call sites; `runtime_checkable` only if you need `isinstance`. `Literal` beats str-typed mode flags; `Annotated` carries validator metadata without changing the runtime type.

## mypy config

```toml
[tool.mypy]
strict = true
warn_unreachable = true
enable_error_code = ["explicit-override", "possibly-undefined"]
```

**Do not pin `python_version`** unless you genuinely target an older runtime — a stale pin like `3.11` makes mypy *reject* PEP 695 syntax outright. Unset, mypy assumes the interpreter it runs under.

## Gotchas

- `type` aliases aren't runtime types: no `isinstance(x, Pair)`.
- PEP 695 params are scoped to their declaration — no leaking a class `T` into unrelated methods.
- Pydantic models want real annotations, not `type` alias indirection for field discrimination.
