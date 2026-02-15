import { fn, mem, BigInt } from 'download0/types'
import { binloader_init } from 'download0/binloader'
import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { checkJailbroken } from 'download0/check-jailbroken'

(function () {
  if (typeof libc_addr === 'undefined') {
    log('Loading userland.js...')
    include('userland.js')
    log('userland.js loaded')
  } else {
    log('userland.js already loaded (libc_addr defined)')
  }

  log('Loading check-jailbroken.js...')
  include('check-jailbroken.js')

  is_jailbroken = checkJailbroken()

  jsmaf.root.children.length = 0

  new Style({ name: 'white', color: '#e0e0e0', size: 28 })
  new Style({ name: 'selected', color: '#4fc3f7', size: 34 })
  new Style({ name: 'title', color: '#ffffff', size: 32 })

  let currentButton = 0
  const buttons: jsmaf.Text[] = []

  type FileEntry = { name: string, path: string }
  const fileList: FileEntry[] = []

  const background = new Image({
    url: 'file:///../download0/img/multiview_bg_VAF.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  jsmaf.root.children.push(background)

  // Title
  const title = new jsmaf.Text()
  title.text = lang.payloadMenu
  title.x = 120
  title.y = 100
  title.style = 'title'
  jsmaf.root.children.push(title)

  fn.register(0x05, 'open_sys', ['bigint', 'bigint', 'bigint'], 'bigint')
  fn.register(0x06, 'close_sys', ['bigint'], 'bigint')
  fn.register(0x110, 'getdents', ['bigint', 'bigint', 'bigint'], 'bigint')
  fn.register(0x03, 'read_sys', ['bigint', 'bigint', 'bigint'], 'bigint')

  const scanPaths = ['/download0/payloads']

  if (is_jailbroken) {
    scanPaths.push('/data/payloads')
    if (typeof CONFIG !== 'undefined' && CONFIG.usb_scan) {
      for (let i = 0; i <= 7; i++) {
        scanPaths.push('/mnt/usb' + i + '/payloads')
      }
    }
  }

  log('Scanning paths: ' + scanPaths.join(', '))

  const path_addr = mem.malloc(256)
  const buf = mem.malloc(4096)

  for (const currentPath of scanPaths) {
    log('Scanning ' + currentPath + ' for files...')

    for (let i = 0; i < currentPath.length; i++) {
      mem.view(path_addr).setUint8(i, currentPath.charCodeAt(i))
    }
    mem.view(path_addr).setUint8(currentPath.length, 0)

    const fd = fn.open_sys(path_addr, new BigInt(0, 0), new BigInt(0, 0))
    // log('open_sys (' + currentPath + ') returned: ' + fd.toString())

    if (!fd.eq(new BigInt(0xffffffff, 0xffffffff))) {
      const count = fn.getdents(fd, buf, new BigInt(0, 4096))
      // log('getdents returned: ' + count.toString() + ' bytes')

      if (!count.eq(new BigInt(0xffffffff, 0xffffffff)) && count.lo > 0) {
        let offset = 0
        while (offset < count.lo) {
          const d_reclen = mem.view(buf.add(new BigInt(0, offset + 4))).getUint16(0, true)
          const d_type = mem.view(buf.add(new BigInt(0, offset + 6))).getUint8(0)
          const d_namlen = mem.view(buf.add(new BigInt(0, offset + 7))).getUint8(0)

          let name = ''
          for (let i = 0; i < d_namlen; i++) {
            name += String.fromCharCode(mem.view(buf.add(new BigInt(0, offset + 8 + i))).getUint8(0))
          }

          // log('Entry: ' + name + ' type=' + d_type)

          if (d_type === 8 && name !== '.' && name !== '..') {
            const lowerName = name.toLowerCase()
            if (lowerName.endsWith('.elf') || lowerName.endsWith('.bin') || lowerName.endsWith('.js')) {
              fileList.push({ name, path: currentPath + '/' + name })
              log('Added file: ' + name + ' from ' + currentPath)
            }
          }

          offset += d_reclen
        }
      }
      fn.close_sys(fd)
    } else {
      log('Failed to open ' + currentPath)
    }
  }

  log('Total files found: ' + fileList.length)

  const listX = 120
  const startY = 200
  const spacing = 45

  // Render File List
  for (let i = 0; i < fileList.length; i++) {
    let displayName = fileList[i]!.name
    if (displayName.length > 50) {
      displayName = displayName.substring(0, 47) + '...'
    }

    const text = new jsmaf.Text()
    text.text = displayName
    text.x = listX
    text.y = startY + i * spacing
    text.style = 'white'
    buttons.push(text)
    jsmaf.root.children.push(text)
  }

  // Back Button
  const exitText = new jsmaf.Text()
  exitText.text = lang.back
  exitText.x = listX
  exitText.y = startY + fileList.length * spacing + 60
  exitText.style = 'white'
  buttons.push(exitText)
  jsmaf.root.children.push(exitText)

  let prevButton = -1

  function updateHighlight () {
    const totalVisible = 16 // simple scroll logic if needed, but keeping basic list for now

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i]
      if (!btn) continue

      if (i === currentButton) {
        btn.style = 'selected'
        btn.x = listX + 25
      } else {
        btn.style = 'white'
        btn.x = listX
      }

      // Basic visibility logic to keep menu on screen (scrolling)
      if (buttons.length > 18) {
        if (i >= currentButton - 8 && i <= currentButton + 8) {
          btn.visible = true
          btn.y = startY + (i - (currentButton - 8)) * spacing
        } else {
          // Keep back button visible if we are near end
          if (i === buttons.length - 1 && currentButton > buttons.length - 10) {
            btn.visible = true
            btn.y = startY + (10) * spacing // approx pos
          } else {
            btn.visible = false
          }
        }
        // Pin back button to bottom if strictly scrolling?
        // For simplicity in this edit, assuming simple vertical list works or scrolling logic renders linearly.
        // Let's just update Y based on scroll offset to keep current selection centered-ish.
        const offset = Math.max(0, currentButton - 8)
        btn.y = startY + (i - offset) * spacing
        btn.visible = (btn.y > 100 && btn.y < 1000)
      }
    }
    prevButton = currentButton
  }

  jsmaf.onKeyDown = function (keyCode) {
    if (keyCode === 6 || keyCode === 5) { // Down / Right
      currentButton = (currentButton + 1) % buttons.length
      updateHighlight()
    } else if (keyCode === 4 || keyCode === 7) { // Up / Left
      currentButton = (currentButton - 1 + buttons.length) % buttons.length
      updateHighlight()
    } else if (keyCode === 14) { // Cross
      handleButtonPress()
    } else if (keyCode === 13) { // Circle (Back)
      log('Going back to main menu...')
      try {
        include('main-menu.js')
      } catch (e) { /* ignore */ }
    }
  }

  function handleButtonPress () {
    if (currentButton === buttons.length - 1) {
      log('Going back to main menu...')
      try {
        include('main-menu.js')
      } catch (e) {
        const err = e as Error
        log('ERROR loading main-menu.js: ' + err.message)
        if (err.stack) log(err.stack)
      }
    } else if (currentButton < fileList.length) {
      const selectedEntry = fileList[currentButton]
      const filePath = selectedEntry!.path
      const fileName = selectedEntry!.name

      log('Selected: ' + fileName + ' from ' + filePath)

      try {
        if (fileName.toLowerCase().endsWith('.js')) {
          // Local JavaScript file case (from /download0/payloads)
          if (filePath.startsWith('/download0/')) {
            log('Including JavaScript file: ' + fileName)
            include('payloads/' + fileName)
          } else {
            // External JavaScript file case (from /data/payloads or /mnt/usbX/payloads)
            log('Reading external JavaScript file: ' + filePath)
            const p_addr = mem.malloc(256)
            for (let i = 0; i < filePath.length; i++) {
              mem.view(p_addr).setUint8(i, filePath.charCodeAt(i))
            }
            mem.view(p_addr).setUint8(filePath.length, 0)

            const fd = fn.open_sys(p_addr, new BigInt(0, 0), new BigInt(0, 0))

            if (!fd.eq(new BigInt(0xffffffff, 0xffffffff))) {
              const buf_size = 1024 * 1024 * 1
              const buf = mem.malloc(buf_size)
              const read_len = fn.read_sys(fd, buf, new BigInt(0, buf_size))

              fn.close_sys(fd)

              let scriptContent = ''
              const len = (read_len instanceof BigInt) ? read_len.lo : read_len

              log('File read size: ' + len + ' bytes')

              for (let i = 0; i < len; i++) {
                scriptContent += String.fromCharCode(mem.view(buf).getUint8(i))
              }

              log('Executing via eval()...')
              // eslint-disable-next-line no-eval
              eval(scriptContent)
            } else {
              log('ERROR: Could not open file for reading!')
            }
          }
        } else {
          log('Loading binloader.js...')
          include('binloader.js')
          log('binloader.js loaded successfully')

          log('Initializing binloader...')
          const { bl_load_from_file } = binloader_init()

          log('Loading payload from: ' + filePath)

          bl_load_from_file(filePath)
        }
      } catch (e) {
        const err = e as Error
        log('ERROR: ' + err.message)
        if (err.stack) log(err.stack)
      }
    }
  }

  updateHighlight()

  log('Interactive UI loaded!')
  log('Total elements: ' + jsmaf.root.children.length)
})()
