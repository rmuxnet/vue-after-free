import { libc_addr } from 'download0/userland'
import { fn, mem, BigInt } from 'download0/types'

if (typeof libc_addr === 'undefined') {
  include('userland.js')
}

// Enable remote play features if needed for UI
jsmaf.remotePlay = true

// register socket stuff
fn.register(97, 'socket', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(98, 'connect', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(104, 'bind', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(105, 'setsockopt', ['bigint', 'bigint', 'bigint', 'bigint', 'bigint'], 'bigint')
fn.register(106, 'listen', ['bigint', 'bigint'], 'bigint')
fn.register(30, 'accept', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(32, 'getsockname', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(3, 'read', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(4, 'write', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(5, 'open', ['string', 'number', 'number'], 'bigint')
fn.register(6, 'close', ['bigint'], 'bigint')
fn.register(0x110, 'getdents', ['number', 'bigint', 'bigint'], 'bigint')
fn.register(93, 'select', ['bigint', 'bigint', 'bigint', 'bigint', 'bigint'], 'bigint')

const socket_sys = fn.socket
const connect_sys = fn.connect
const bind_sys = fn.bind
const setsockopt_sys = fn.setsockopt
const listen_sys = fn.listen
const accept_sys = fn.accept
const getsockname_sys = fn.getsockname
const read_sys = fn.read
const write_sys = fn.write
const open_sys = fn.open
const close_sys = fn.close
const getdents_sys = fn.getdents
const select_sys = fn.select

const AF_INET = 2
const SOCK_STREAM = 1
const SOCK_DGRAM = 2
const SOL_SOCKET = 0xFFFF
const SO_REUSEADDR = 0x4
const O_RDONLY = 0

// scan download0 for js files
function scan_js_files () {
  const files: string[] = []

  // try different paths for payloads dir
  const paths = ['/download0/', '/app0/download0/', 'download0/payloads']
  let dir_fd = -1
  let opened_path = ''

  for (const path of paths) {
    const dirRet = open_sys(path, O_RDONLY, 0)
    dir_fd = dirRet.lo

    if (dir_fd >= 0) {
      opened_path = path
      break
    }
  }

  if (dir_fd < 0) {
    log('cant open download0/payloads')
    return files
  }

  log('opened: ' + opened_path)

  const dirent_buf = mem.malloc(1024)

  while (true) {
    const ret = getdents_sys(dir_fd, dirent_buf, new BigInt(1024)).lo
    if (ret <= 0) break

    let offset = 0
    while (offset < ret) {
      const d_reclen = mem.view(dirent_buf).getUint16(offset + 4, true)
      const d_type = mem.view(dirent_buf).getUint8(offset + 6)
      const d_namlen = mem.view(dirent_buf).getUint8(offset + 7)

      let name = ''
      for (let i = 0; i < d_namlen; i++) {
        name += String.fromCharCode(mem.view(dirent_buf).getUint8(offset + 8 + i))
      }

      // only .js files
      if (name !== '.' && name !== '..' && d_type === 8 && name.length > 3 && name.substring(name.length - 3) === '.js') {
        files.push(name)
      }

      offset += d_reclen
    }
  }

  close_sys(new BigInt(dir_fd))
  return files
}

const js_files = scan_js_files()
log('found ' + js_files.length + ' js files')

// Detect IP
log('detecting local ip...')
const detect_fd = socket_sys(new BigInt(0, AF_INET), new BigInt(0, SOCK_DGRAM), new BigInt(0, 0))
let local_ip = '127.0.0.1'

if (detect_fd.lo >= 0) {
  const detect_addr = mem.malloc(16)
  mem.view(detect_addr).setUint8(0, 16)
  mem.view(detect_addr).setUint8(1, AF_INET)
  mem.view(detect_addr).setUint16(2, 0x3500, false) // 53
  mem.view(detect_addr).setUint32(4, 0x08080808, false) // 8.8.8.8

  if (connect_sys(detect_fd, detect_addr, new BigInt(0, 16)).lo >= 0) {
    const local_addr = mem.malloc(16)
    const local_len = mem.malloc(4)
    mem.view(local_len).setUint32(0, 16, true)
    if (getsockname_sys(detect_fd, local_addr, local_len).lo >= 0) {
      const ip_int = mem.view(local_addr).getUint32(4, false)
      local_ip = ((ip_int >> 24) & 0xFF) + '.' + ((ip_int >> 16) & 0xFF) + '.' + ((ip_int >> 8) & 0xFF) + '.' + (ip_int & 0xFF)
    }
  }
  close_sys(detect_fd)
}

// Build HTML
let fileListHtml = ''
for (const f of js_files) {
  fileListHtml += `<button onclick="runFile('${f}')" style="font-size:16px;padding:10px;margin:5px;">${f}</button><br>`
}

const html = `<!DOCTYPE html>
<html>
<head>
<title>PS4 Web UI</title>
<style>
body{background:#111;color:#eee;font-family:sans-serif;text-align:center;padding:20px;}
h1{color:#e0e0e0;}
.panel{background:#222;padding:20px;border-radius:10px;margin:20px auto;max-width:600px;}
button.big{background:#0d47a1;color:#fff;border:none;padding:15px 30px;font-size:20px;cursor:pointer;border-radius:5px;}
button.big:hover{background:#1565c0;}
code{background:#333;padding:2px 5px;border-radius:3px;}
</style>
</head>
<body>
<h1>Vue-After-Free Web UI</h1>
<div class="panel">
  <h2>Jailbreak / Loader</h2>
  <button class="big" onclick="fetch('/load')">Run Loader</button>
  <p>Runs <code>loader.js</code> (Auto-detects exploit)</p>
</div>

<div class="panel">
  <h2>Payloads (.js)</h2>
  ${fileListHtml}
</div>

<div class="panel">
  <h2>BinLoader</h2>
  <p>To load .bin or .elf files, use Netcat:</p>
  <code>nc -w 3 ${local_ip} 9020 < payload.bin</code>
  <p><em>(Ensure BinLoader is running first via Loader)</em></p>
</div>

<script>
function runFile(f) {
    if(confirm('Run ' + f + '?')) {
        fetch('/load/' + f).then(t => alert('Executed ' + f));
    }
}
</script>
</body>
</html>`

// Create Server
// create server socket
log('creating server...')
const srv = socket_sys(new BigInt(0, AF_INET), new BigInt(0, SOCK_STREAM), new BigInt(0, 0))
if (srv.lo < 0) throw new Error('cant create socket')

// set SO_REUSEADDR
const optval = mem.malloc(4)
mem.view(optval).setUint32(0, 1, true)
setsockopt_sys(srv, new BigInt(0, SOL_SOCKET), new BigInt(0, SO_REUSEADDR), optval, new BigInt(0, 4))

// bind to 0.0.0.0:0 (let os pick port)
const addr = mem.malloc(16)
mem.view(addr).setUint8(0, 16)
mem.view(addr).setUint8(1, AF_INET)
mem.view(addr).setUint16(2, 0, false) // port 0
mem.view(addr).setUint32(4, 0, false) // 0.0.0.0

if (bind_sys(srv, addr, new BigInt(0, 16)).lo < 0) {
  close_sys(srv)
  throw new Error('bind failed')
}

// get actual port
const actual_addr = mem.malloc(16)
const actual_len = mem.malloc(4)
mem.view(actual_len).setUint32(0, 16, true)
getsockname_sys(srv, actual_addr, actual_len)
const port = mem.view(actual_addr).getUint16(2, false)

log('got port: ' + port)

// listen
if (listen_sys(srv, new BigInt(0, 5)).lo < 0) {
  close_sys(srv)
  throw new Error('listen failed')
}

log('server started on 0.0.0.0:' + port)
log('local url: http://127.0.0.1:' + port)
log('network url: http://' + local_ip + ':' + port)

// try to open browser
try {
  jsmaf.openWebBrowser('http://127.0.0.1:' + port)
  log('opened browser')
} catch (e) {
  log('couldnt open browser: ' + (e as Error).message)
}

// Show info on screen
jsmaf.root.children.length = 0
new Style({ name: 'infobig', color: '#ffffff', size: 40 })
new Style({ name: 'infosmall', color: '#aaaaaa', size: 26 })

const bg = new Image({ url: 'file:///../download0/img/multiview_bg_VAF.png', x: 0, y: 0, width: 1920, height: 1080 })
jsmaf.root.children.push(bg)

const t1 = new jsmaf.Text(); t1.text = 'Web UI Running'; t1.x = 100; t1.y = 100; t1.style = 'infobig'; jsmaf.root.children.push(t1)
const t2 = new jsmaf.Text(); t2.text = 'http://' + local_ip + ':' + port; t2.x = 100; t2.y = 160; t2.style = 'infobig'; jsmaf.root.children.push(t2)
const t3 = new jsmaf.Text(); t3.text = 'Open this URL on your PC/Phone'; t3.x = 100; t3.y = 220; t3.style = 'infosmall'; jsmaf.root.children.push(t3)

function send_response (fd: BigInt, body: string) {
  const resp = 'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ' + body.length + '\r\nConnection: close\r\n\r\n' + body
  const buf = mem.malloc(resp.length)
  for (let i = 0; i < resp.length; i++) mem.view(buf).setUint8(i, resp.charCodeAt(i))
  write_sys(fd, buf, new BigInt(0, resp.length))
}

function get_path (buf: BigInt, len: number) {
  let req = ''
  for (let i = 0; i < len && i < 1024; i++) {
    const c = mem.view(buf).getUint8(i)
    if (c === 0) break
    req += String.fromCharCode(c)
  }
  const lines = req.split('\n')
  if (lines.length > 0) {
    const parts = lines[0]!.trim().split(' ')
    if (parts.length >= 2) return parts[1]
  }
  return '/'
}

let count = 0
let serverRunning = true
const readfds = mem.malloc(128)
const timeout = mem.malloc(16) // 0 timeout for non-blocking poll
mem.view(timeout).setUint32(0, 0, true)
mem.view(timeout).setUint32(4, 0, true)
mem.view(timeout).setUint32(8, 0, true)
mem.view(timeout).setUint32(12, 0, true)

const client_addr = mem.malloc(16)
const client_len = mem.malloc(4)
const req_buf = mem.malloc(4096)

function handleRequest () {
  if (!serverRunning) return

  for (let i = 0; i < 128; i++) mem.view(readfds).setUint8(i, 0)
  const fd = srv.lo
  mem.view(readfds).setUint8(Math.floor(fd / 8), mem.view(readfds).getUint8(Math.floor(fd / 8)) | (1 << (fd % 8)))

  const nfds = fd + 1
  const select_ret = select_sys(new BigInt(0, nfds), readfds, new BigInt(0, 0), new BigInt(0, 0), timeout)

  // No connection ready
  if (select_ret.lo <= 0) return

  mem.view(client_len).setUint32(0, 16, true)
  const client_ret = accept_sys(srv, client_addr, client_len)
  const client = client_ret instanceof BigInt ? client_ret.lo : client_ret

  if (client < 0) {
    log('accept failed: ' + client)
    return
  }

  count++
  log('')
  log('[' + count + '] client connected')

  const r = read_sys(new BigInt(client), req_buf, new BigInt(0, 4096))
  const bytes = r instanceof BigInt ? r.lo : r

  const path = get_path(req_buf, bytes)
  log('path: ' + path)

  if (path === '/load') {
    send_response(new BigInt(client), 'Running Loader...')
    close_sys(new BigInt(client))
    try { include('loader.js') } catch (e) { log('Error: ' + e.message) }
  } else if (path?.indexOf('/load/') === 0) {
    const fname = path.substring(6)
    send_response(new BigInt(client), 'Running ' + fname)
    close_sys(new BigInt(client))
    try { include('download0/payloads/' + fname) } catch (e) { log('Error: ' + e.message) }
  } else {
    send_response(new BigInt(client), html)
    close_sys(new BigInt(client))
  }
}

jsmaf.onEnterFrame = handleRequest

jsmaf.onKeyDown = function (k) {
  if (k === 13) { // Circle
    serverRunning = false
    close_sys(srv)
    jsmaf.onEnterFrame = null
    jsmaf.onKeyDown = null
    try { include('main-menu.js') } catch (e) {}
  }
}
