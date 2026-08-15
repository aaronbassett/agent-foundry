# CLI and TUI Development in Rust

Clap for argument parsing, Ratatui for terminal UIs.

```toml
[dependencies]
clap = { version = "4.6", features = ["derive", "env"] }
clap_complete = "4.6"   # shell completion generation
ratatui = "0.30"        # re-exports crossterm as ratatui::crossterm
indicatif = "0.18"      # progress bars
colored = "3"           # terminal colors
dialoguer = "0.12"      # interactive prompts
dirs = "6"              # platform config/cache/data dirs
```

## Clap (derive)

One example covering subcommands, custom validation, env fallback, and value enums:

```rust
use clap::{Parser, Subcommand, ValueEnum};

#[derive(Parser)]
#[command(name = "myapp", version, about)]
struct Cli {
    /// Database URL (first line of a doc comment = short help)
    #[arg(long, env = "DATABASE_URL")]
    database_url: String,

    #[arg(long, value_enum, default_value_t = Format::Json)]
    format: Format,

    /// Port to listen on
    #[arg(short, long, value_parser = parse_port)]
    port: u16,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Add files
    Add { files: Vec<String> },
    /// Commit staged changes
    Commit {
        #[arg(short, long)]
        message: String,
    },
}

#[derive(ValueEnum, Clone)]
enum Format { Json, Yaml }

fn parse_port(s: &str) -> Result<u16, String> {
    let port: u16 = s.parse().map_err(|_| format!("`{s}` is not a valid port"))?;
    if port < 1024 { return Err("port must be >= 1024".into()); }
    Ok(port)
}
```

Gotchas and one-liners:

- `#[arg(env = ...)]` needs the `env` feature; precedence is flag > env > default.
- Mutually exclusive flags: `#[command(group = ArgGroup::new("out").required(true).args(["stdout", "file"]))]`.
- Shell completions: `clap_complete::generate(shell, &mut Cli::command(), "myapp", &mut io::stdout())` (where `Cli::command()` comes from `clap::CommandFactory`) — expose via a `completions <SHELL>` subcommand taking a `clap_complete::Shell`.
- Exit codes: return `std::process::ExitCode` from `main` (`ExitCode::SUCCESS`, `ExitCode::from(2)`) instead of `process::exit`, which skips destructors.

## Ratatui (0.30)

The frame's drawing region is `f.area()`. `ratatui::init()` enables raw mode + alternate screen and installs a panic hook that restores the terminal; `ratatui::restore()` undoes it. Import crossterm through `ratatui::crossterm` so event types can't version-skew against ratatui's own crossterm dependency.

```rust
use ratatui::Frame;
use ratatui::crossterm::event::{self, Event, KeyCode};
use ratatui::layout::{Constraint, Direction, Layout};
use ratatui::widgets::{Block, Paragraph};

fn main() -> std::io::Result<()> {
    let mut terminal = ratatui::init();
    loop {
        terminal.draw(draw)?;
        if let Event::Key(key) = event::read()? {
            if key.code == KeyCode::Char('q') { break; }
        }
    }
    ratatui::restore();
    Ok(())
}

fn draw(f: &mut Frame) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(0)])
        .split(f.area());
    f.render_widget(Paragraph::new("header").block(Block::bordered()), chunks[0]);
    f.render_widget(Paragraph::new("press q to quit"), chunks[1]);
}
```

- Hold app state in a struct; `terminal.draw(|f| ui(f, &app))`. For tick-based updates, `event::poll(timeout)` before `event::read()`.
- Stateful widgets (`List`, `Table`) pair the widget with a `ListState`/`TableState` kept in your app struct, rendered via `render_stateful_widget`.
- `Block::bordered()` replaces `Block::default().borders(Borders::ALL)`.

## Helper crates

```rust
use colored::Colorize;
use dialoguer::Confirm;
use indicatif::{ProgressBar, ProgressStyle};

fn helpers(total: u64) -> Result<(), Box<dyn std::error::Error>> {
    // indicatif: set style once, then inc()/finish()
    let pb = ProgressBar::new(total);
    pb.set_style(
        ProgressStyle::with_template("{spinner:.green} [{bar:40.cyan/blue}] {pos}/{len} ({eta})")?
            .progress_chars("#>-"),
    );
    pb.inc(1);
    pb.finish_with_message("done");

    // colored
    println!("{}", "Error!".red().bold());

    // dialoguer
    if Confirm::new().with_prompt("Continue?").interact()? { /* ... */ }

    // dirs: never hardcode ~/.config
    let _config = dirs::config_dir().unwrap().join("myapp/config.toml");
    Ok(())
}
```

## Testing CLIs with assert_cmd

Canonical reference — [testing.md](testing.md) links here.

```toml
[dev-dependencies]
assert_cmd = "2"
predicates = "3"
```

```rust
use assert_cmd::Command;
use predicates::prelude::*;

#[test]
fn runs_with_input() {
    Command::cargo_bin("myapp")
        .unwrap()
        .args(["--input", "test.txt"])
        .assert()
        .success()
        .stdout(predicate::str::contains("Success"));
}

#[test]
fn missing_arg_fails() {
    Command::cargo_bin("myapp")
        .unwrap()
        .assert()
        .failure()
        .stderr(predicate::str::contains("required"));
}
```

`Command::cargo_bin` runs your compiled binary from `target/`; feed stdin with `.write_stdin("...")` and use `tempfile` for filesystem fixtures.

## Practices

- Follow Unix conventions: errors to stderr, exit codes, read stdin / write stdout so the tool pipes.
- Implement `--dry-run` for destructive operations; handle SIGINT so raw-mode TUIs restore the terminal (ratatui's panic hook covers panics, not signals).
