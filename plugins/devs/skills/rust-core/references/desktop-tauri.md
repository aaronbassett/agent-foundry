# Desktop Development with Tauri 2

Tauri 2 reference (Rust backend + system-webview frontend). All Rust snippets compile against `tauri = "2"` (2.11.x, Aug 2026).

## v1 → v2 migration landmarks

Do NOT emit v1 APIs. Every row's left column is gone in v2:

| Tauri v1 | Tauri v2 |
|---|---|
| `"allowlist"` in `tauri.conf.json` | Capability files in `src-tauri/capabilities/` granting permissions |
| Config keys `"package"`, `"tauri"`, `"devPath"`, `"distDir"` | Top-level `productName`/`version`/`identifier`; `"app"` section; `build.devUrl` / `build.frontendDist` |
| `import { invoke } from '@tauri-apps/api/tauri'` | `import { invoke } from '@tauri-apps/api/core'` |
| `tauri::api::path::*` | `app.path().app_data_dir()` etc. (`Manager` trait; returns `Result`) |
| `tauri::api::dialog` | `tauri-plugin-dialog` (`DialogExt`) |
| `WindowBuilder` / `WindowUrl` / `Window` | `WebviewWindowBuilder` / `WebviewUrl` / `WebviewWindow` |
| `app.get_window("main")` | `app.get_webview_window("main")` |
| `CustomMenuItem` / `SystemTray` / `SystemTrayMenu` | `tauri::menu::{Menu, MenuItem}` + `tauri::tray::TrayIconBuilder` (cargo feature `tray-icon`) |
| `window.emit` via `Manager` | `Emitter` trait (`emit`, `emit_to`); `Listener` trait (`listen`) |
| Built-in updater | `tauri-plugin-updater` |
| `libwebkit2gtk-4.0-dev` | `libwebkit2gtk-4.1-dev` |

## Setup

Linux: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`. macOS: Xcode CLT. Windows: MSVC Build Tools + WebView2 runtime. Scaffold with `npm create tauri-app@latest`.

`src-tauri/Cargo.toml`: `tauri = "2"`, `tauri-build = "2"` (build-dependency). npm: `@tauri-apps/api` 2.11, `@tauri-apps/cli` 2.11. `cargo tauri dev` / `cargo tauri build`.

## tauri.conf.json (v2 schema)

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "my-app",
  "version": "0.1.0",
  "identifier": "com.example.myapp",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "My App", "width": 800, "height": 600 }],
    "security": { "csp": "default-src 'self'" }
  },
  "bundle": { "active": true, "targets": "all", "icon": ["icons/icon.png"] }
}
```

## Capabilities and permissions

Core/plugin IPC is deny-by-default; grant per window via `src-tauri/capabilities/*.json` (validated at build time — unknown identifiers fail compilation):

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    {
      "identifier": "fs:allow-read-text-file",
      "allow": [{ "path": "$APPDATA/**" }]
    }
  ]
}
```

Permission grammar: `<plugin>:default`, `<plugin>:allow-<command>`, `<plugin>:deny-<command>`; scoped entries take `identifier` + `allow`/`deny` arrays. Core permissions are `core:`-prefixed (`core:window:allow-set-title`, ...).

## Commands, state, events

```rust
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

struct AppState { counter: Mutex<i32> }

#[tauri::command]
fn increment(state: State<AppState>) -> i32 {
    let mut n = state.counter.lock().unwrap();
    *n += 1;
    *n
}

#[tauri::command]
async fn process(app: AppHandle) -> Result<(), String> {
    app.emit("progress", 50).map_err(|e| e.to_string())?;      // every listener
    app.emit_to("main", "done", ()).map_err(|e| e.to_string()) // one target
}

#[tauri::command]
fn data_dir(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.display().to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState { counter: Mutex::new(0) })
        .invoke_handler(tauri::generate_handler![increment, process, data_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Sync commands run on a separate thread (blocking OK, e.g. `app.dialog().file().blocking_pick_file()` via `DialogExt`); async commands run on the async runtime. Rust-side listening: `app.listen("evt", |event| { ... })` (`Listener` trait).

Frontend:

```js
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const n = await invoke('increment');
const unlisten = await listen('progress', (e) => console.log(e.payload));
```

## Windows

```rust
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
async fn open_settings(app: AppHandle) -> Result<(), String> {
    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("settings.html".into()))
        .title("Settings")
        .inner_size(400.0, 600.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

Lookup: `app.get_webview_window("main")` (needs `Manager` in scope).

## Tray

Requires `tauri = { version = "2", features = ["tray-icon"] }`. Call from `.setup(|app| ...)`:

```rust
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;
    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}
```

## Updater

```rust
use tauri_plugin_updater::UpdaterExt;

async fn update(app: AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        update.download_and_install(|_chunk, _total| {}, || {}).await?;
        app.restart();
    }
    Ok(())
}
```

## Plugin ecosystem

Register with `.plugin(tauri_plugin_<name>::init())` (store and updater expose `Builder`), add the matching permission to a capability, and pair each crate with its `@tauri-apps/plugin-<name>` npm package (versions match). Current crate versions (Aug 2026): `tauri-plugin-store` 2.4, `tauri-plugin-updater` 2.10, `tauri-plugin-dialog` 2.7, `tauri-plugin-fs` 2.5, `tauri-plugin-http` 2.5, `tauri-plugin-notification` 2.3, `tauri-plugin-shell` 2.3, `tauri-plugin-sql` 2.4, `tauri-plugin-opener` 2.5. Pin as `"2"` and let the lockfile resolve. Store JS API: `import { load } from '@tauri-apps/plugin-store'; const store = await load('store.json');` then `store.get`/`set`/`save`.
