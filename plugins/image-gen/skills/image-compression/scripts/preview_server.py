#!/usr/bin/env python3
"""Minimal static file server for image-compression previews.

Serves a directory over loopback on an OS-chosen free port, writes a PID and
info file into a state directory, auto-shuts down after an idle timeout, and
prints a one-line ``server-started`` JSON object so the launcher can relay the
URL. Pure stdlib — no dependencies.

Usually invoked via ``start-preview.sh`` (background) rather than directly.
"""

import argparse
import json
import os
import signal
import sys
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

_last_request = time.time()
_lock = threading.Lock()


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        # Keep stdout clean; the launcher parses the server-started line.
        pass

    def _touch(self):
        global _last_request
        with _lock:
            _last_request = time.time()

    def do_GET(self):
        self._touch()
        super().do_GET()

    def do_HEAD(self):
        self._touch()
        super().do_HEAD()


def idle_watcher(httpd, timeout_s):
    if timeout_s <= 0:
        return
    while True:
        time.sleep(5)
        with _lock:
            idle = time.time() - _last_request
        if idle >= timeout_s:
            httpd.shutdown()
            return


def main():
    p = argparse.ArgumentParser(description="Serve an image-compression preview directory.")
    p.add_argument("--dir", required=True, help="Directory to serve (must contain index.html).")
    p.add_argument("--host", default="127.0.0.1", help="Bind host (default 127.0.0.1).")
    p.add_argument("--url-host", default=None, help="Hostname used in the printed URL (default = --host).")
    p.add_argument("--state-dir", required=True, help="Where to write server.pid / server-info.json.")
    p.add_argument("--idle-timeout-minutes", type=float, default=240.0,
                   help="Auto-shutdown after this many minutes with no requests (0 = never).")
    p.add_argument("--open", action="store_true", help="Open the URL in the default browser.")
    args = p.parse_args()

    serve_dir = os.path.abspath(args.dir)
    if not os.path.isdir(serve_dir):
        sys.exit("error: --dir not found: " + serve_dir)
    os.makedirs(args.state_dir, exist_ok=True)

    handler = partial(Handler, directory=serve_dir)
    httpd = ThreadingHTTPServer((args.host, 0), handler)
    port = httpd.server_address[1]
    url_host = args.url_host or args.host
    url = "http://{}:{}/".format(url_host, port)

    info = {
        "type": "server-started",
        "pid": os.getpid(),
        "port": port,
        "url": url,
        "serve_dir": serve_dir,
        "state_dir": os.path.abspath(args.state_dir),
    }
    with open(os.path.join(args.state_dir, "server.pid"), "w") as f:
        f.write(str(os.getpid()))
    with open(os.path.join(args.state_dir, "server-info.json"), "w") as f:
        json.dump(info, f)

    print(json.dumps(info), flush=True)

    def shutdown(*_):
        threading.Thread(target=httpd.shutdown, daemon=True).start()
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    threading.Thread(
        target=idle_watcher,
        args=(httpd, args.idle_timeout_minutes * 60.0),
        daemon=True,
    ).start()

    if args.open:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    finally:
        httpd.server_close()
        with open(os.path.join(args.state_dir, "server-stopped.json"), "w") as f:
            json.dump({"type": "server-stopped", "port": port}, f)
        for fn in ("server.pid",):
            try:
                os.remove(os.path.join(args.state_dir, fn))
            except OSError:
                pass


if __name__ == "__main__":
    main()
