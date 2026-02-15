// Updater - fetches latest scripts from GitHub Pages
// Smart Versioning: Checks commit hash before downloading

import { utils } from 'download0/types'

(function () {
  var BASE_URL = 'http://rmux.me/vue-after-free/download0/'
  var MANIFEST_URL = BASE_URL + 'manifest.txt'
  var VERSION_URL = BASE_URL + 'version.txt'
  var LOCAL_ROOT = 'file://../download0/'
  var LOCAL_VERSION_URL = LOCAL_ROOT + 'version.txt'

  var ALLOWED_EXT = ['.js', '.aes', '.json', '.txt']
  var EXCLUDE = ['config.js']

  var FILES: string[] = []
  var updated = 0
  var failed = 0
  var skipped = 0
  var index = 0

  var remoteVersion = ''
  var localVersion = ''

  // UI Elements
  var progressBg: Image
  var progressFg: Image
  var statusText: jsmaf.Text
  var titleText: jsmaf.Text
  var countText: jsmaf.Text

  var barX = 360
  var barY = 500
  var barW = 1200
  var barH = 40

  function initUI () {
    jsmaf.root.children.length = 0

    new Style({ name: 'title', color: 'white', size: 36 })
    new Style({ name: 'status', color: 'white', size: 24 })
    new Style({ name: 'count', color: 'rgb(180,180,180)', size: 20 })

    var bg = new Image({
      url: 'file:///../download0/img/multiview_bg_VAF.png',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    })
    jsmaf.root.children.push(bg)

    titleText = new jsmaf.Text()
    titleText.text = 'Checking Version...'
    titleText.x = 960 - 180
    titleText.y = 420
    titleText.style = 'title'
    jsmaf.root.children.push(titleText)

    progressBg = new Image({
      url: 'file:///assets/img/button_over_9.png',
      x: barX,
      y: barY,
      width: barW,
      height: barH
    })
    progressBg.alpha = 0.3
    jsmaf.root.children.push(progressBg)

    progressFg = new Image({
      url: 'file:///assets/img/button_over_9.png',
      x: barX,
      y: barY,
      width: 0,
      height: barH
    })
    progressFg.alpha = 1.0
    jsmaf.root.children.push(progressFg)

    statusText = new jsmaf.Text()
    statusText.text = 'Connecting to server...'
    statusText.x = barX
    statusText.y = barY + 60
    statusText.style = 'status'
    jsmaf.root.children.push(statusText)

    countText = new jsmaf.Text()
    countText.text = ''
    countText.x = barX
    countText.y = barY - 40
    countText.style = 'count'
    jsmaf.root.children.push(countText)
  }

  function updateProgress () {
    var total = FILES.length
    var done = index
    var pct = total > 0 ? done / total : 0
    progressFg.width = Math.floor(barW * pct)
    countText.text = done + ' / ' + total + ' (updated: ' + updated + ')'
  }

  function updateStatus (msg: string) {
    statusText.text = msg
  }

  function xhrGet (url: string, callback: (err: Error | null, data: string) => void) {
    var xhr = new jsmaf.XMLHttpRequest()
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 0) {
          callback(null, xhr.responseText || '')
        } else {
          callback(new Error('XHR failed'), '')
        }
      }
    }
    xhr.open('GET', url, true)
    xhr.send()
  }

  function writeFile (filename: string, content: string, callback: (err: Error | null) => void) {
    var xhr = new jsmaf.XMLHttpRequest()
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        callback(xhr.status === 0 || xhr.status === 200 ? null : new Error('write failed'))
      }
    }
    xhr.open('POST', LOCAL_ROOT + filename, true)
    xhr.send(content)
  }

  function checkDone () {
    updateProgress()

    log('Entering checkDone. Updated: ' + updated + ', Failed: ' + failed)

    // Ensure we save exactly what we compared against (trimmed)
    if (updated > 0 && remoteVersion.length > 0) {
      log('Saving version.txt...')
      writeFile('version.txt', remoteVersion.trim(), function (err) {
        if (err) log('Warning: Failed to save version.txt')
        else log('version.txt saved successfully')
      })
    }

    updateStatus('Updated: ' + updated + (failed > 0 ? ', Failed: ' + failed : ''))
    titleText.text = 'Update Complete!'
    titleText.x = 960 - 130
    log('=== Update Complete ===')
    log('Updated: ' + updated + ' | Failed: ' + failed)

    // Check directly against 0
    if (failed <= 0) {
      log('No failures detected. Proceeding to auto-restart sequence.')

      try {
        utils.notify('Updated to ' + remoteVersion)
      } catch (e) {
        log('Notification failed: ' + e)
      }

      log('Update success condition met. Preparing auto-restart...')

      updateStatus('Auto-restarting in 3 seconds...')

      // Clear key listeners to prevent interference during countdown
      log('Clearing key listeners...')
      jsmaf.onKeyDown = function () {}

      log('Setting timeout for restart (3000ms)...')
      jsmaf.setTimeout(function () {
        try {
          titleText.text = 'Restarting...'
        } catch (e) {}

        log('Executing debugging.restart()...')
        // Small delay to ensure text updates before the process kill happens
        jsmaf.setTimeout(function () {
          try {
            log('Calling debugging.restart() NOW.')
            debugging.restart()
          } catch (e) {
            log('FATAL: debugging.restart() threw exception: ' + e)
          }
        }, 100)
      }, 3000)
      return
    }

    log('Update had failures (or was 0?), showing manual restart prompt.')
    showRestartPrompt()
  }

  function showRestartPrompt () {
    log('Entering showRestartPrompt()...')
    var confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
    var backKey = jsmaf.circleIsAdvanceButton ? 14 : 13
    var buttonName = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
    var backName = jsmaf.circleIsAdvanceButton ? 'X' : 'O'

    var restartText = new jsmaf.Text()
    restartText.text = 'Press ' + buttonName + ' to restart app, or ' + backName + ' to return'
    restartText.x = 960 - 250
    restartText.y = barY + 120
    restartText.style = 'status'
    jsmaf.root.children.push(restartText)
    log('Restart prompt UI added.')

    jsmaf.onKeyDown = function (keyCode: number) {
      log('Key pressed in restart prompt: ' + keyCode)
      if (keyCode === confirmKey) {
        log('Confirm key pressed. Restarting...')
        jsmaf.onKeyDown = function () {}
        debugging.restart()
      } else if (keyCode === backKey) {
        log('Back key pressed. Loading main menu...')
        jsmaf.onKeyDown = function () {}
        try {
          include('main-menu.js')
        } catch (e) {
          log('Error returning to main menu: ' + e)
        }
      }
    }
  }

  function processNext () {
    if (index >= FILES.length) {
      checkDone()
      return
    }

    var filename = FILES[index]!
    updateStatus(filename)
    updateProgress()

    if (!isAllowed(filename) || EXCLUDE.indexOf(filename) !== -1 || filename === 'version.txt') {
      skipped++
      index++
      jsmaf.setTimeout(processNext, 1)
      return
    }

    xhrGet(BASE_URL + filename, function (err, content) {
      if (!err && content.length > 0) {
        writeFile(filename, content, function (err) {
          if (err) failed++
          else updated++

          index++
          jsmaf.setTimeout(processNext, 10)
        })
      } else {
        failed++
        index++
        jsmaf.setTimeout(processNext, 10)
      }
    })
  }

  function isAllowed (filename: string) {
    var lower = filename.toLowerCase()
    for (var i = 0; i < ALLOWED_EXT.length; i++) {
      if (lower.indexOf(ALLOWED_EXT[i]!, lower.length - ALLOWED_EXT[i]!.length) !== -1) return true
    }
    return false
  }

  function fetchManifest () {
    titleText.text = 'Updating Files...'
    xhrGet(MANIFEST_URL, function (err, data) {
      if (!err && data) {
        var lines = data.split('\n')
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i]!.trim()
          if (line.length > 0) FILES.push(line)
        }
        updateStatus('Found ' + FILES.length + ' files')
        jsmaf.setTimeout(processNext, 500)
      } else {
        updateStatus('ERROR: Failed to fetch manifest')
      }
    })
  }

  function startVersionCheck () {
    xhrGet(LOCAL_VERSION_URL, function (err, data) {
      // Ensure we trim local read to avoid mismatch due to newlines
      localVersion = !err ? data.trim() : 'NONE'

      xhrGet(VERSION_URL, function (err, data) {
        if (err) {
          log('Remote version.txt not found, forcing update.')
          remoteVersion = 'UNKNOWN'
          fetchManifest()
          return
        }

        remoteVersion = data.trim()
        log('Ver Check: Local="' + localVersion + '" Remote="' + remoteVersion + '"')

        // Direct string comparison works fine even with hash (e.g. "v1.4.1 (abc)")
        // as long as the file written to disk matches the remote file exactly.
        if (localVersion === remoteVersion && localVersion !== 'NONE') {
          titleText.text = 'Already Up to Date!'
          statusText.text = 'Version: ' + localVersion
          progressFg.width = barW

          var forceText = new jsmaf.Text()
          forceText.text = 'Press Square (\u25A1) to force update'
          forceText.x = barX
          forceText.y = barY + 80
          forceText.style = 'status'
          jsmaf.root.children.push(forceText)

          // Reuse the restart prompt logic but add Square handler
          var confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
          var backKey = jsmaf.circleIsAdvanceButton ? 14 : 13
          var buttonName = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
          var backName = jsmaf.circleIsAdvanceButton ? 'X' : 'O'

          var restartText = new jsmaf.Text()
          restartText.text = 'Press ' + buttonName + ' to restart app, or ' + backName + ' to return'
          restartText.x = 960 - 250
          restartText.y = barY + 140
          restartText.style = 'status'
          jsmaf.root.children.push(restartText)

          log('Waiting for user input (Square/Confirm/Back)...')

          jsmaf.onKeyDown = function (keyCode) {
            log('Key pressed in Up-To-Date menu: ' + keyCode)
            // Square confirmed as 15
            if (keyCode === 15) { // Square
              log('Square detected. Forcing manifest fetch...')
              jsmaf.onKeyDown = function () {}
              forceText.text = ''
              restartText.text = ''
              fetchManifest()
            } else if (keyCode === confirmKey) {
              log('Confirm detected. Restarting...')
              debugging.restart()
            } else if (keyCode === backKey) {
              log('Back detected. Returning to main menu...')
              jsmaf.onKeyDown = function () {}
              try { include('main-menu.js') } catch (e) { }
            }
          }
        } else {
          updateStatus('New version found! Starting update...')
          jsmaf.setTimeout(fetchManifest, 1000)
        }
      })
    })
  }

  initUI()
  startVersionCheck()
})()
