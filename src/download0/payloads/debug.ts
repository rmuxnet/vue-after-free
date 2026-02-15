// Key Debugger - Displays keycodes for pressed buttons

(function () {
  jsmaf.root.children.length = 0

  new Style({ name: 'title', color: '#ffffff', size: 40 })
  new Style({ name: 'code', color: '#00ff00', size: 120 })
  new Style({ name: 'info', color: '#aaaaaa', size: 24 })

  var bg = new Image({
    url: 'file:///../download0/img/multiview_bg_VAF.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  jsmaf.root.children.push(bg)

  var titleText = new jsmaf.Text()
  titleText.text = 'Key Debugger'
  titleText.x = 830
  titleText.y = 100
  titleText.style = 'title'
  jsmaf.root.children.push(titleText)

  var infoText = new jsmaf.Text()
  infoText.text = 'Press any button to see its KeyCode.'
  infoText.x = 760
  infoText.y = 200
  infoText.style = 'info'
  jsmaf.root.children.push(infoText)

  var buttonNameText = new jsmaf.Text()
  buttonNameText.text = ''
  buttonNameText.x = 960
  buttonNameText.y = 350
  buttonNameText.style = 'title' // Recycle title style
  jsmaf.root.children.push(buttonNameText)

  var lastKeyText = new jsmaf.Text()
  lastKeyText.text = '-'
  lastKeyText.x = 900
  lastKeyText.y = 450
  lastKeyText.style = 'code'
  jsmaf.root.children.push(lastKeyText)

  var exitText = new jsmaf.Text()
  exitText.text = 'Reload app to exit.'
  exitText.x = 850
  exitText.y = 800
  exitText.style = 'info'
  jsmaf.root.children.push(exitText)

  var keyMap: { [key: number]: string } = {
    15: 'Square',
    14: 'Cross (X)',
    13: 'Circle (O)',
    12: 'Triangle',
    11: 'R1',
    10: 'L1',
    4: 'Up',
    6: 'Down',
    7: 'Left',
    5: 'Right',
    3: 'Options',
    8: 'L2 (Btn)',
    53: 'L2 (Axis)',
    9: 'R2 (Btn)',
    54: 'R2 (Axis)',
    2: 'R3',
    1: 'L3'
  }

  log('[KeyDebugger] Started. Press buttons to debug.')

  jsmaf.onKeyDown = function (keyCode) {
    var name = keyMap[keyCode] || 'Unknown'
    log('[KeyDebugger] Key Pressed: ' + keyCode + ' (' + name + ')')

    buttonNameText.text = name
    // Center name text
    var nameWidth = (buttonNameText.text.length * 20)
    buttonNameText.x = 960 - (nameWidth / 2)

    lastKeyText.text = '' + keyCode

    // Center the text based on length (approximate)
    var width = (lastKeyText.text.length * 70)
    lastKeyText.x = 960 - (width / 2)
  }
})()
