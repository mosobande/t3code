# Connections and Remote Access

## Local profile

The SIGIDI desktop app can accept direct connections from the inherited mobile app when both
devices are on the same trusted Wi-Fi or local network:

1. Open **Settings** → **Connections**.
2. Enable local-network access. SIGIDI restarts its backend and shows a reachable LAN address.
3. Select **Add connection**, then scan the QR code with the mobile app or use the shown pairing
   link.

The same page lists issued pairing links and authenticated client sessions. A session can be a
desktop app, a web browser, or a mobile app. The list identifies the current session and shows the
last connection state. Revoke one old pairing link or client session from its row. Select
**Clear other connections** to revoke every session except the one that is managing the list.

Local-network access is off by default. Tailscale HTTPS, SSH environments, and WSL are also off by
default and have their own controls. Relay, managed tunnels, hosted authentication, mobile push,
and a public hosted SIGIDI web service are not available in this profile. Treat a pairing link like
a password and use local-network access only on a network that you trust.

The rest of this guide describes the direct connection options that are available in `local`.
Sections marked as upstream references describe compatibility code that is not a SIGIDI service.

Use this when you want to connect to a SIGIDI server from another device such as a phone, tablet, or separate desktop app.

## Quick Pairing for a Running Server

If a server is already running on this machine, mint a fresh pairing token and QR code without restarting anything:

```bash
npx @sigidi/cli@latest pair
```

The SIGIDI CLI finds the running server (the shared `~/.sigidi` install, or the current worktree's
dev server when run inside one), issues a one-time pairing token, and prints the pairing URL as a QR
code you can scan from your phone.

If the server is only bound to loopback, the printed URL is not reachable from another device. Pair over your tailnet instead:

```bash
npx @sigidi/cli@latest pair --tailscale
```

This publishes the server over Tailscale Serve HTTPS (configuring the mapping if needed — it persists until you run `tailscale serve --https=443 off`) and pairs through the `https://machine.tailnet.ts.net/` URL. Use `--tailscale-serve-port` for a different HTTPS port, `--ttl` to change the token lifetime, and `--base-dir` to target a specific data directory.

If no server is running, the command says so and points you at
`npx @sigidi/cli@latest serve`.

## Recommended Setup

Use a trusted private network that meshes your devices together, such as a tailnet.

That gives you:

- a stable address to connect to
- transport security at the network layer
- less exposure than opening the server to the public internet

## Enabling Network Access

There are three ways to reach your server from another device: expose the desktop app's backend,
run a headless server from the CLI, or have the desktop app launch SIGIDI over SSH.

### Option 1: Desktop App

If you are already running the desktop app and want to make it reachable from other devices:

1. Open **Settings** → **Connections**.
2. Under **This environment**, toggle **Network access** on. This will restart the app and run the backend on all network interfaces.
3. The settings panel will show the default reachable endpoint, with a `+N` control when more endpoints are available. Expand it to inspect alternatives such as loopback, LAN, private-network, or HTTPS endpoints.
4. Use **Create Link** to generate a pairing link you can share with another device.

The default endpoint controls the QR code and primary copy action for pairing links. You can change it from the expanded endpoint list. The preference is stored by endpoint type, so choosing the local LAN endpoint survives normal IP address changes when you move between networks.

When no user default is saved, the app uses the built-in LAN endpoint for pairing links when
available. You can set another endpoint as the default from the expanded endpoint list.

- HTTPS/WSS-compatible endpoints use a direct pairing URL.
- Non-loopback HTTP endpoints are useful for direct LAN pairing.
- Loopback-only endpoints are not useful for another device unless that device is the same machine.

Open a copied pairing link from a SIGIDI client that can reach its backend address.

In the mobile app's **Add Environment** form, a numeric IP address without a scheme uses HTTP. Include `https://` explicitly when the backend is served over HTTPS.

### Tailscale Endpoints

When the desktop app can detect Tailscale, it adds Tailnet endpoints to the reachable endpoint list.

Depending on your Tailscale setup, this may include:

- the machine's `100.x.y.z` Tailnet IP
- a MagicDNS name
- an HTTPS MagicDNS endpoint when Tailscale Serve is configured for this backend

The Tailscale HTTPS endpoint uses the clean MagicDNS URL, such as
`https://machine.tailnet.ts.net/`, and is off until you opt in. Turn on **Enable Tailscale HTTPS**
on the **Tailscale HTTPS** row in **Settings** → **Connections**. The desktop app restarts the
backend with the same server-side behavior as `npx @sigidi/cli@latest serve --tailscale-serve`, then the server asks
Tailscale Serve to proxy HTTPS traffic to the local backend. Turn the same switch off to stop it.

On macOS, allow the signed SIGIDI app to control Tailscale if Tailscale asks. If activation does not
produce the HTTPS endpoint, the row stays enabled, reports that the endpoint is unavailable, and
offers **Retry**. You can also turn the switch off to return to the disabled state.

SIGIDI uses the `tailscale` client and daemon that are already installed and signed in on the host.
You provide and control the tailnet. SIGIDI does not host a tailnet or ask for a Tailscale API token,
auth key, account password, or control-server address.

The Tailscale support is an endpoint provider add-on. The core remote model still works without Tailscale: LAN HTTP endpoints, custom HTTPS endpoints, future tunnels, and SSH-launched environments all use the same saved environment and pairing flow.

If you operate your own HTTPS reverse proxy, set `T3CODE_DESKTOP_HTTPS_ENDPOINTS` to one or more
comma-separated HTTPS URLs before starting the desktop backend. SIGIDI advertises valid entries; it
does not configure DNS, certificates, or the proxy. Change or unset the variable and restart the
backend to remove an advertised endpoint.

### Option 2: Headless Server (CLI)

Use this when you want to run the server without a GUI, for example on a remote machine over SSH.

Run the server with the SIGIDI CLI.

```bash
npx @sigidi/cli@latest serve --host "$(tailscale ip -4)"
```

The command starts the server without opening a browser and prints:

- a connection string
- a pairing token
- a pairing URL
- a QR code for the pairing URL

From there, connect from another device in either of these ways:

- scan the QR code on your phone
- in the desktop app, enter the full pairing URL
- in the desktop app, enter the host and token separately

Use `npx @sigidi/cli@latest serve --help` for the full flag reference. It supports the same general
startup options as the normal server command, including an optional `cwd` argument.

For direct pairing over Tailscale HTTPS, opt in to Tailscale Serve:

```bash
npx @sigidi/cli@latest serve --tailscale-serve
```

By default this configures Tailscale Serve on HTTPS port 443 and advertises
`https://machine.tailnet.ts.net/`. Advanced users can choose a different HTTPS port:

```bash
npx @sigidi/cli@latest serve --tailscale-serve --tailscale-serve-port 8443
```

Once paired, add projects normally: open the Command Palette and choose **Add Project**, then pick
the environment the project lives on. Every saved environment is offered, not only the local one.

### Option 3: Desktop-Managed SSH Launch

Use this when you want the desktop app to start or reuse SIGIDI on another machine over SSH.

1. Open **Settings** → **Connections**.
2. Under **Remote Environments**, choose **Add environment**.
3. Select the SSH launch flow.
4. Enter the SSH target, such as `user@example.com`.
5. Confirm the launch. The desktop app probes the host, starts or reuses a remote SIGIDI server,
   opens a local port forward, and saves the environment.

A packaged SIGIDI client runs the exact matching `@sigidi/cli@<app-version>` package from npm. It
does not substitute another global `t3` command. The remote host therefore needs Node.js and npm or
npx, plus network access to npm for the first launch of that version.

The `t3` executable/process name and `T3CODE_*` environment-variable prefix remain compatibility
identifiers. Public install and update commands use the owned `@sigidi/cli` package name.

SSH remains a direct SSH connection with a local port forward. It does not use or configure T3
Connect, Relay, Clerk, or Cloudflare. The SIGIDI npm package uses the local product profile. Dormant
inherited code can remain in its bundle, but managed-service commands and activation stay disabled.

After setup, the renderer connects to a local forwarded HTTP/WebSocket endpoint. The remote host
still owns the actual SIGIDI server, projects, files, git state, terminals, and provider sessions.

SSH launch is a desktop feature because it needs local process and SSH access. Once the environment is paired and saved, it uses the same environment list and connection model as direct LAN, Tailscale, HTTPS, or future tunnel-backed environments.

### WSL Backends

On Windows, **Settings** → **Connections** can start a backend in an installed WSL distribution.
WSL is off by default. Select a distribution to run it beside the Windows backend, or enable
**WSL only** to use it as the primary backend. Select **Off** to stop the secondary WSL backend.
SIGIDI uses the existing local `wsl.exe` installation and does not require Relay or hosted
authentication.

#### SSH Launch Troubleshooting

The desktop SSH launcher connects with a non-interactive `sh` session, writes a small launcher script
under `~/.sigidi/ssh-launch/<host-key>/`, starts or reuses a remote SIGIDI server, and forwards the
remote loopback port back to your desktop.

The remote host must have a compatible Node.js runtime. SIGIDI uses the server package's `engines.node` requirement:

```text
^22.16 || ^23.11 || >=24.10
```

During SSH launch, SIGIDI first checks whether `node` is on `PATH`. If it is missing, the launcher
looks in the usual install directories and tries to activate a version manager if it finds one
(Volta, asdf, mise, fnm, nodenv, nvm). That covers most setups, but a version manager that only
initializes from an interactive shell profile will not be picked up.

If launch fails with `node: command not found`, a port-scan failure, or a message that the remote Node version does not satisfy the required range, SSH into the host and check the same non-interactive shell path SIGIDI uses:

```bash
ssh user@example.com 'sh -lc "command -v node && node --version"'
```

If that does not print a compatible Node version, configure your version manager for non-interactive shells or install a compatible Node binary in one of the searched locations. For example, with nvm you may need a default alias:

```bash
nvm alias default 24
```

With mise, asdf, fnm, or nodenv, make sure the tool's shim directory is installed and resolves to a Node version satisfying the range above without an interactive shell.

If reconnecting after an app update fails, retry the SSH launch once. The launcher compares its
generated runner script, stops stale launcher-managed remote servers, clears the SSH launch PID/port
state, and starts a fresh remote server. Packaged clients pin the exact matching SIGIDI CLI version,
so retrying the same app version does not move to a different remote server. You should not normally
need to delete `~/.sigidi/ssh-launch` or kill `t3` processes manually.

## Updating a Remote Server

When the SIGIDI web or desktop app and a remote server use different versions, a warning appears in
the conversation and in **Settings** → **Connections**. A version difference is possible when SSH
uses a different `@sigidi/cli` version. Follow the action shown there: SIGIDI may be
able to update and reconnect the server for you, or it may ask you to update the desktop app or run a
copied command on the server machine.

Finish active work before updating because the server restarts briefly. For step-by-step guidance,
see [Keeping SIGIDI in Sync](./updating.md).

On a Linux host, you can keep the server running after logout and manage it independently of the
connection method. See [Running SIGIDI in the Background](./background-service.md).

## How Pairing Works

The remote device does not need a long-lived secret up front.

Instead:

1. `npx @sigidi/cli@latest serve` issues a one-time owner pairing token.
2. The remote device exchanges that token with the server.
3. The server creates an authenticated session for that device.

After pairing, future access is session-based. You do not need to keep reusing the original token unless you are pairing a new device.

## Managing Access Later

Use `npx @sigidi/cli@latest auth` to manage access after the initial pairing flow.

Typical uses:

- issue additional pairing credentials
- inspect active sessions
- revoke old pairing links or sessions

Use `npx @sigidi/cli@latest auth --help` and the nested subcommand help pages for the full
reference.

## Security Notes

- Treat pairing URLs and pairing tokens like passwords.
- Prefer binding `--host` to a trusted private address, such as a Tailnet IP, instead of exposing the server broadly.
- Anyone with a valid pairing credential can create a session until that credential expires or is revoked.
- Pairing links keep the credential in the URL hash, but browser history, screenshots, logs, or
  copy/paste can still expose it.
- Use `npx @sigidi/cli@latest auth` to revoke credentials or sessions you no longer trust.
