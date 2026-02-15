import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'
import { fn, BigInt } from 'download0/types'

(function () {
  include('languages.js')
  log(lang.loadingMainMenu)

  // Fix: APP_VERSION error. Use local variable and try to read file.
  // We use the fallback initially, but reading version.txt dictates the display.
  // Although 1.4.2 is hardcoded here as a fallback, the app prefers version.txt
  let appVersion = '1.4.2'
  try {
    const xhr = new jsmaf.XMLHttpRequest()
    // Read from the relative path where updater saves it
    xhr.open('GET', 'file://../download0/version.txt', false)
    xhr.send()
    if (xhr.status === 200 || xhr.status === 0) {
      if (xhr.responseText && xhr.responseText.length > 0) {
        appVersion = xhr.responseText.trim()
      }
    }
  } catch (e) {
    log('Failed to load version.txt: ' + (e as Error).message)
  }

  let currentButton = 0
  const buttons: jsmaf.Text[] = []

  jsmaf.root.children.length = 0

  new Style({ name: 'white', color: '#e0e0e0', size: 30 })
  new Style({ name: 'selected', color: '#4fc3f7', size: 36 })
  new Style({ name: 'version', color: '#888888', size: 18 })

  const background = new Image({
    url: 'file:///../download0/img/multiview_bg_VAF.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  jsmaf.root.children.push(background)

  const verText = new jsmaf.Text()
  verText.text = appVersion
  verText.x = 1750
  verText.y = 1030
  verText.style = 'version'
  jsmaf.root.children.push(verText)

  const menuOptions = [
    { label: lang.jailbreak, script: 'loader.js' },
    { label: lang.payloadMenu, script: 'payload_host.js' },
    { label: lang.config, script: 'config_ui.js' },
    { label: lang.webUi, script: 'web-ui.js' },
    { label: lang.updater, script: 'payloads/updater.js' }
  ]

  const listX = 120
  const startY = 350
  const spacing = 80

  for (let i = 0; i < menuOptions.length; i++) {
    const btn = new jsmaf.Text()
    btn.text = menuOptions[i]!.label
    btn.x = listX
    btn.y = startY + i * spacing
    btn.style = 'white'
    buttons.push(btn)
    jsmaf.root.children.push(btn)
  }

  const exitBtn = new jsmaf.Text()
  exitBtn.text = lang.exit
  exitBtn.x = listX
  exitBtn.y = startY + menuOptions.length * spacing + 60
  exitBtn.style = 'white'
  buttons.push(exitBtn)
  jsmaf.root.children.push(exitBtn)

  let prevButton = -1

  function updateHighlight () {
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i]
      if (!btn) continue

      if (i === currentButton) {
        btn.style = 'selected'
        btn.x = listX + 25 // Indent selected item
      } else {
        btn.style = 'white'
        btn.x = listX
      }
    }
    prevButton = currentButton
  }

  function handleButtonPress () {
    if (currentButton === buttons.length - 1) {
      log('Exiting application...')
      try {
        if (typeof libc_addr === 'undefined') {
          log('Loading userland.js...')
          include('userland.js')
        }

        fn.register(0x14, 'getpid', [], 'bigint')
        fn.register(0x25, 'kill', ['bigint', 'bigint'], 'bigint')

        const pid = fn.getpid()
        const pid_num = (pid instanceof BigInt) ? pid.lo : pid
        log('Current PID: ' + pid_num)
        log('Sending SIGKILL to PID ' + pid_num)

        fn.kill(pid, new BigInt(0, 9))
      } catch (e) {
        log('ERROR during exit: ' + (e as Error).message)
        if ((e as Error).stack) log((e as Error).stack!)
      }

      jsmaf.exit()
    } else if (currentButton < menuOptions.length) {
      const selectedOption = menuOptions[currentButton]
      if (!selectedOption) return
      if (selectedOption.script === 'loader.js') {
        jsmaf.onKeyDown = function () {}
      }
      log('Loading ' + selectedOption.script + '...')
      try {
        include(selectedOption.script)
      } catch (e) {
        log('ERROR loading ' + selectedOption.script + ': ' + (e as Error).message)
        if ((e as Error).stack) log((e as Error).stack!)
      }
    }
  }

  updateHighlight()

  // Prevent accidental double clicks / buffered input from triggering options immediately
  let inputReady = false
  setTimeout(function () {
    inputReady = true
  }, 500)

  jsmaf.onKeyDown = function (keyCode) {
    if (!inputReady) return

    if (keyCode === 6 || keyCode === 5) {
      currentButton = (currentButton + 1) % buttons.length
      updateHighlight()
    } else if (keyCode === 4 || keyCode === 7) {
      currentButton = (currentButton - 1 + buttons.length) % buttons.length
      updateHighlight()
    } else if (keyCode === 14) {
      handleButtonPress()
    }
  }

  updateHighlight()

  log(lang.mainMenuLoaded)
})()
