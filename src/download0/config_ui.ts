import { libc_addr } from 'download0/userland'

import { lang } from 'download0/languages'

if (typeof libc_addr === 'undefined') {
  include('userland.js')
}

if (typeof lang === 'undefined') {
  include('languages.js')
}

(function () {
  log(lang.loadingConfig)

  const fs = {
    write: function (filename: string, content: string, callback: (error: Error | null) => void) {
      const xhr = new jsmaf.XMLHttpRequest()
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && callback) {
          callback(xhr.status === 0 || xhr.status === 200 ? null : new Error('failed'))
        }
      }
      xhr.open('POST', 'file://../download0/' + filename, true)
      xhr.send(content)
    },

    read: function (filename: string, callback: (error: Error | null, data?: string) => void) {
      const xhr = new jsmaf.XMLHttpRequest()
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && callback) {
          callback(xhr.status === 0 || xhr.status === 200 ? null : new Error('failed'), xhr.responseText)
        }
      }
      xhr.open('GET', 'file://../download0/' + filename, true)
      xhr.send()
    }
  }

  const currentConfig: {
    autolapse: boolean
    autopoop: boolean
    autoclose: boolean
    usb_scan: boolean
    jb_behavior: number
  } = {
    autolapse: false,
    autopoop: false,
    autoclose: false,
    usb_scan: false,
    jb_behavior: 0
  }

  // Store user's payloads so we don't overwrite them
  let userPayloads: string[] = []
  let configLoaded = false

  const jbBehaviorLabels = [lang.jbBehaviorAuto, lang.jbBehaviorNetctrl, lang.jbBehaviorLapse]

  let currentButton = 0
  const buttons: jsmaf.Text[] = []
  const valueTexts: jsmaf.Text[] = []

  jsmaf.root.children.length = 0

  new Style({ name: 'white', color: '#e0e0e0', size: 30 })
  new Style({ name: 'selected', color: '#4fc3f7', size: 36 })
  new Style({ name: 'val_active', color: '#a5d6a7', size: 30 }) // Light green for ON
  new Style({ name: 'val_inactive', color: '#ef9a9a', size: 30 }) // Light red for OFF
  new Style({ name: 'title', color: '#ffffff', size: 32 })

  const background = new Image({
    url: 'file:///../download0/img/multiview_bg_VAF.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  jsmaf.root.children.push(background)

  const title = new jsmaf.Text()
  title.text = lang.config
  title.x = 120
  title.y = 100
  title.style = 'title'
  jsmaf.root.children.push(title)

  const configOptions = [
    { key: 'autolapse', label: lang.autoLapse, type: 'toggle' },
    { key: 'autopoop', label: lang.autoPoop, type: 'toggle' },
    { key: 'autoclose', label: lang.autoClose, type: 'toggle' },
    { key: 'usb_scan', label: lang.usbScan, type: 'toggle' },
    { key: 'jb_behavior', label: lang.jbBehavior, type: 'cycle' }
  ]

  const listX = 120
  const startY = 300
  const spacing = 60

  for (let i = 0; i < configOptions.length; i++) {
    const configOption = configOptions[i]!

    // Label
    const btnText = new jsmaf.Text()
    btnText.text = configOption.label
    btnText.x = listX
    btnText.y = startY + i * spacing
    btnText.style = 'white'
    buttons.push(btnText)
    jsmaf.root.children.push(btnText)

    // Value Indicator
    const valText = new jsmaf.Text()
    valText.x = listX + 400
    valText.y = startY + i * spacing
    valText.style = 'white'

    if (configOption.type === 'toggle') {
      const value = currentConfig[configOption.key as keyof typeof currentConfig]
      valText.text = value ? 'ON' : 'OFF'
      valText.style = value ? 'val_active' : 'val_inactive'
    } else {
      valText.text = jbBehaviorLabels[currentConfig.jb_behavior] || ''
    }

    valueTexts.push(valText)
    jsmaf.root.children.push(valText)
  }

  // Back Button
  const backText = new jsmaf.Text()
  backText.text = lang.back
  backText.x = listX
  backText.y = startY + configOptions.length * spacing + 60
  backText.style = 'white'
  buttons.push(backText)
  jsmaf.root.children.push(backText)

  // Placeholder in value list for back button to keep indices aligned
  const dummyVal = new jsmaf.Text()
  dummyVal.text = ''
  valueTexts.push(dummyVal)
  jsmaf.root.children.push(dummyVal)

  let prevButton = -1

  function updateHighlight () {
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
    }
    prevButton = currentButton
  }

  function updateValueText (index: number) {
    const options = configOptions[index]
    const valueText = valueTexts[index]
    if (!options || !valueText) return
    const key = options.key

    if (options.type === 'toggle') {
      const value = currentConfig[key as keyof typeof currentConfig]
      valueText.text = value ? 'ON' : 'OFF'
      valueText.style = value ? 'val_active' : 'val_inactive'
    } else {
      valueText.text = jbBehaviorLabels[currentConfig.jb_behavior] || jbBehaviorLabels[0]!
    }
  }

  function saveConfig () {
    if (!configLoaded) {
      log('Config not loaded yet, skipping save')
      return
    }
    let configContent = 'const CONFIG = {\n'
    configContent += '    autolapse: ' + currentConfig.autolapse + ',\n'
    configContent += '    autopoop: ' + currentConfig.autopoop + ',\n'
    configContent += '    autoclose: ' + currentConfig.autoclose + ',\n'
    configContent += '    usb_scan: ' + currentConfig.usb_scan + ',\n'
    configContent += '    jb_behavior: ' + currentConfig.jb_behavior + '\n'
    configContent += '};\n\n'
    configContent += 'const payloads = [ //to be ran after jailbroken\n'
    for (let i = 0; i < userPayloads.length; i++) {
      configContent += '    "' + userPayloads[i] + '"'
      if (i < userPayloads.length - 1) {
        configContent += ','
      }
      configContent += '\n'
    }
    configContent += '];\n'

    fs.write('config.js', configContent, function (err) {
      if (err) {
        log('ERROR: Failed to save config: ' + err.message)
      } else {
        log('Config saved successfully')
      }
    })
  }

  function loadConfig () {
    fs.read('config.js', function (err: Error | null, data?: string) {
      if (err) {
        log('ERROR: Failed to read config: ' + err.message)
        return
      }

      try {
        eval(data || '') // eslint-disable-line no-eval
        if (typeof CONFIG !== 'undefined') {
          currentConfig.autolapse = CONFIG.autolapse || false
          currentConfig.autopoop = CONFIG.autopoop || false
          currentConfig.autoclose = CONFIG.autoclose || false
          currentConfig.usb_scan = CONFIG.usb_scan || false
          currentConfig.jb_behavior = CONFIG.jb_behavior || 0

          // Preserve user's payloads
          if (typeof payloads !== 'undefined' && Array.isArray(payloads)) {
            userPayloads = payloads.slice()
          }

          for (let i = 0; i < configOptions.length; i++) {
            updateValueText(i)
          }
          configLoaded = true
          log('Config loaded successfully')
        }
      } catch (e) {
        log('ERROR: Failed to parse config: ' + (e as Error).message)
        configLoaded = true // Allow saving even on error
      }
    })
  }

  function handleButtonPress () {
    if (currentButton === buttons.length - 1) {
      log('Going back to main menu...')
      try {
        include('main-menu.js')
      } catch (e) {
        log('ERROR loading main-menu.js: ' + (e as Error).message)
      }
    } else if (currentButton < configOptions.length) {
      const option = configOptions[currentButton]!
      const key = option.key

      if (option.type === 'cycle') {
        currentConfig.jb_behavior = (currentConfig.jb_behavior + 1) % jbBehaviorLabels.length
        log(key + ' = ' + jbBehaviorLabels[currentConfig.jb_behavior])
      } else {
        const boolKey = key as 'autolapse' | 'autopoop' | 'autoclose' | 'usb_scan'
        currentConfig[boolKey] = !currentConfig[boolKey]

        if (key === 'autolapse' && currentConfig.autolapse === true) {
          currentConfig.autopoop = false
          for (let i = 0; i < configOptions.length; i++) {
            if (configOptions[i]!.key === 'autopoop') {
              updateValueText(i)
              break
            }
          }
          log('autopoop disabled (autolapse enabled)')
        } else if (key === 'autopoop' && currentConfig.autopoop === true) {
          currentConfig.autolapse = false
          for (let i = 0; i < configOptions.length; i++) {
            if (configOptions[i]!.key === 'autolapse') {
              updateValueText(i)
              break
            }
          }
          log('autolapse disabled (autopoop enabled)')
        }

        log(key + ' = ' + currentConfig[boolKey])
      }

      updateValueText(currentButton)
      saveConfig()
    }
  }

  jsmaf.onKeyDown = function (keyCode) {
    if (keyCode === 6 || keyCode === 5) {
      currentButton = (currentButton + 1) % buttons.length
      updateHighlight()
    } else if (keyCode === 4 || keyCode === 7) {
      currentButton = (currentButton - 1 + buttons.length) % buttons.length
      updateHighlight()
    } else if (keyCode === 14) {
      handleButtonPress()
    } else if (keyCode === 13) {
      log('Going back to main menu...')
      // Unbind key handler before leaving
      jsmaf.onKeyDown = function () { }
      try {
        include('main-menu.js')
      } catch (e) { /* ignore */ }
    }
  }

  updateHighlight()
  loadConfig()

  log(lang.configLoaded)
})()
