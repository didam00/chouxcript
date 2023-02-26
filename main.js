Coloris({
  themeMode: 'dark',
  wrap: false,
  margin: 10,
})

// server

// // main.js
// if ("serviceWorker" in navigator) {
//   // Register service worker
//   navigator.serviceWorker.register(new URL("./sw.js", import.meta.url)).then(
//     function (registration) {
//       console.log("COOP/COEP Service Worker registered", registration.scope);
//       // If the registration is active, but it's not controlling the page
//       if (registration.active && !navigator.serviceWorker.controller) {
//           window.location.reload();
//       }
//     },
//     function (err) {
//       console.log("COOP/COEP Service Worker failed to register", err);
//     }
//   );
// } else {
//   console.warn("Cannot register a service worker");
// }

let system = {
  pointer: {
    down: {
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
      which: 0,
    },
    current: {
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
    },
    up: {
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
      which: 0,
    },
    isDown: false,
    onTimeInterfaceDown: false,
    onTimeInterfaceTime: 0,
  },
  keyboard: {
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    enterKey: false,
    spaceKey: false,
  },
  current_tool: 'select_object',
  current_layer: 0,
  doing: [],
  logs: [],
  now_log: -1,
  showRemainTime: false,
  selectedObject: [],
  cursor: 'default',
  isRecording: false,
  mediaRecorder: null,
  streamData: [],
  fakeCtx: null,
  input: '',
  drawMode: 'rectangle',
  programFPS: '',
  programOpenTime: 0,
  programRunTime: 0,
  // programLoopOpenTime: 0,
  programLoopRunTime: 0,
  programTimeDifference: 0,
  currentFPS: 0,
  lastFrameRate: 1000/60,
  realTime_startTime: 0,
  recordCancled: false,
  recordStartTime: 0,
  recordEndTime: 0,
  transformedAnything: false,

  mainColor: '#49c771',

  delayFunction: [],
  fitScreen() {
    let previewRatio = $('#video_preview_cover').width() / $('#video_preview_cover').height();
    let canvasRatio = config.canvas.width / config.canvas.height;
    
    let woh = previewRatio >= canvasRatio ? 'height' : 'width';
    preview.zoom = ($('#video_preview')[woh]() - 60) / config.canvas[woh];

    // preview.position.x = -($('#toolbar').width())/2;
    preview.position.x = 0;
    preview.position.y = 0;
  },
  export() {
    system.recordStartTime = Number($('#exportStartTime td[contenteditable]').text())
    system.recordEndTime = Number($('#exportEndTime td[contenteditable]').text())

    $('#export_cover').css('display', 'block');
    $('#export_cover .state .text').text('영상을 녹화 중... (페이지를 아래로 내리면 안됩니다.)');
    $('#export_cover progress')[0].value = 0;
    $('#export_cover progress')[0].max = system.recordEndTime - system.recordStartTime;
    $('#export_interface').hide();
    $('#export_cover .cancle').text('취소');

    const mediaStream = config.canvas.canvas[0].captureStream(Number($('#exportFPS td[contenteditable]').text()));
    system.mediaRecorder = new MediaRecorder(mediaStream);
    system.mediaRecorder.ondataavailable = (event) => {
      system.streamData.push(event.data);
    }

    system.mediaRecorder.onstop = async (event) => {
      if(!this.recordCancled) {
        system.isRecording = false;
        $('#export_cover .state .text').text('완료!');
        preview.times = 0;
        preview.onStart = false;

        const blob = new Blob(system.streamData);
        let blobURL = window.URL.createObjectURL(blob);
  
        $('#video_recorded')[0].play();
        $('#video_recorded').animate({
          opacity: 1,
        }, 1000);

        if($('#exportConvert td:nth-child(3)').text() == 'true') {
          let convert = await webm2mp4({
            url: blobURL,
            fps: Number($('#exportFPS td[contenteditable]').text()),
          });

          console.log(convert)
          trashcan = convert

          blobURL = convert.url;
        }
  
        const anchor = document.createElement('a');
        document.body.appendChild(anchor);
        anchor.style.display = 'none';
        anchor.href = blobURL;
        
        if($('#exportConvert td:nth-child(3)').text() == 'true') {
          anchor.download = $('#exportFileName td[contenteditable]').text()+'.mp4';
        } else {
          anchor.download = $('#exportFileName td[contenteditable]').text()+'.webm';
        }
        anchor.click();

        $('#video_recorded')[0].src = blobURL;
  
        this.streamData = [];
        this.recordCancled = false;
        // URL.revokeObjectURL(blobURL);
      } else {
        developer.log('recording is cancled.');
      }
    }

    system.mediaRecorder.start();
    
    preview.times = system.recordStartTime;
    system.start();

    system.isRecording = true;
    developer.log('start recording...');
  },

  cancleAll() {
    system.input = '';
    if(system.doing.length > 0) {
      if(system.doing.indexOf('move_object') != -1) {
        for(let i of system.selectedObject) {
          i.property = _.cloneDeep(i.before);
          for(let j = 0; j < keys(i.transform).length; j++) {
            i.transform[keys(i.transform)[j]] = 0;
          }
        }
      }
      system.doing = [];
      system.selectedObject = [];
      for(let i = 0; i < objs.length; i++) {
        objs[i].isSelected = false;
        objs[i].isTransformed = false;
        objs[i].property = _.cloneDeep(objs[i].before);
      }
    }
  },
  start() {
    if(!system.transformedAnything) {
      $('.start_button').toggleClass('active');
      if($('.start_button').hasClass('active')) {
        if(preview.times == video.maxTimes) {
          preview.times = 0;
        }
        preview.onStart = true;
        if(settings.autoFPS) settings.setFrameRate(system.lastFrameRate);
        $('.start_button').attr('src', 'assets/stop_button.png');
      } else {
        recordCanvas();
        preview.onStart = false;
        $('.start_button').attr('src', 'assets/start_button.png');
      }
      system.realTime_startTime = new Date().getTime();
      system.cancleAll();
    }
  },
  changeColor(hex) {
    $('#color_picker input')[0].value = hex;
  },
  changeDrawMode(mode) {
    system.drawMode = mode;
  },
  save() {
    saveFile(video.projectName, JSON.stringify(video));
  },
  showSettingsTab() {
    $('#cover').fadeIn(150);
    $('#settings_interface').show();
    for(let i = 0; i < $('#settings_interface tr').length; i++) {
      $('#settings_interface td:nth-child(3n)')[i].innerHTML = settings[$($('#settings_interface tr')[i])[0].id];
    }
  },
  showExportTab() {
    $('#cover').fadeIn(150);
    $('#export_interface').show();
    $('#exportEndTime td[contenteditable]').text(video.maxTimes);
  },
  showConfigTab() {
    $('#cover').fadeIn(150);
    $('#config_interface').show();
    $('#canvasWidth td[contenteditable]').text(config.canvas.width);
    $('#canvasHeight td[contenteditable]').text(config.canvas.height);
    $('#configMaxTime td[contenteditable]').text(video.maxTimes);
  },
}

let developer = {
  log(a) {
    if(settings.developerMode) console.log('%c[Developer] %c'+a, 'font-weight: bold; color: #00f;', 'font-weight: regular;');
  }
}

let selects = [];
let select = null;
system.selectClone = null;

let objs = [];

let settings = {
  zoom_level: 0.1,
  max_logs: 80,
  point_color: '#F61C41',
  frameRate: 1000/60,
  setFrameRate(a) {
    this.frameRate = a;
    clearInterval(config.programLoop);
    config.programLoop = setInterval(config.programLoopFunction, this.frameRate);
    return this.frameRate;
  },
  developerMode: true,
  basicLineWidth: 1,
  // autoFPS: true,
  realTime: false, // 프리뷰를 재생시킬 때 실제 시간에 맞춰서 재생 (녹화 중엔 강제 활성화)
  proRecording: false,
  randomColor: true,
}

let config = {
  canvas: {
    width: 1920,
    height: 1080,
    ctx: null,
    canvas: null,
  },
}

let preview = {
  times: 0,
  onStart: false,
  zoom: 0,

  position: {
    x: 0,
    y: 0,
  },
  lastImageData: null,
}

let video = {
  projectName: 'video',
  globalCode: '',
  background: '#ffffff',
  layers: [
    {
      name: 'layer_1',
      objects: [],
    },
  ],
  maxTimes: 5000,
}

$(document).on('contextmenu', function () {
  return false;
})

window.onload = function () {
  system.programOpenTime = new Date().getTime();
  // settings
  config.canvas.canvas = $('#video_preview #canvas');
  config.canvas.ctx = config.canvas.canvas[0].getContext('2d');
  system.fakeCtx = $('#fakeCanvas')[0].getContext('2d');

  system.fitScreen();

  $('#object_information').hover(function () {
    if(system.doing.includes('moving_object')) {
      $(this).css('opacity', 0.33);
      $(this).css('backdrop-filter', 'none');
    } else {
      $(this).css('opacity', 1);
      $(this).css('backdrop-filter', 'blur(10px)');
    }
  }, function () {
    $(this).css('opacity', 1);
    $(this).css('backdrop-filter', 'blur(10px)');
  });

  $('#object_information .apply').click(function () {
    for(let i = 0; i < $('#object_information tr').length; i++) {
      let value = $('#object_information tr')[i].children[1].innerText;
      if(value == 'true') value = true;
      if(!_.isNaN(Number(value))) value = Number(value);
      if(conditional(value, '==', ['false', 'true'], 'or') && $('#object_information tr')[i].children[0] != 'text') {
        value = value == 'true';
      }
      if($('#object_information tr')[i].children[0].innerText == 'x') {

      }
      select.property[$('#object_information tr')[i].children[0].innerText] = value;
    }
  })

  $('.interface_tab .quit_tab').click(function () {
    $('#cover').fadeOut(150);
    $(this).parent().hide();
  })
  
  $('.interface_tab tr[variableType="boolean"] td:nth-child(3n)').click(function () {
    this.innerHTML = this.innerHTML == 'true' ? 'false' : 'true';
  })

  $('#settings_interface .apply').click(function () {
    for(let i = 0; i < $('#settings_interface tr').length; i++) {
      let value = $('#settings_interface td:nth-child(3n)')[i].innerText;
      switch($($('#settings_interface tr')[i]).attr('variableType')) {
        case 'boolean': value = value == 'true'; break;
        case 'number': value = Number(value); break;
      }
      settings[$($('#settings_interface tr')[i])[0].id] = value;
    }
    $('#settings_interface .quit_tab').click();
  })
  
  $('#export_interface .apply').click(function () {
    $('#settings_interface .quit_tab').click();
    system.export();
  })

  $('#config_interface .apply').click(function () {
    config.canvas.width = Number($('#canvasWidth td[contenteditable]').text());
    config.canvas.height = Number($('#canvasHeight td[contenteditable]').text());
    video.maxTimes = Number($('#configMaxTime td[contenteditable]').text());
    config.canvas.canvas[0].width = config.canvas.width;
    config.canvas.canvas[0].height = config.canvas.height;
    $('#config_interface .quit_tab').click();
    drawing();
  })

  $('#export_cover .cancle').click(function () {
    if(preview.times != 0) {
      system.recordCancled = true;
      system.mediaRecorder.stop();
      preview.onStart = false;
      preview.times = 0;
      drawing();
      $('#export_cover').hide();
    } else {
      $('#export_cover').hide();
    }
  })

  $('#layers_tab').css('top', -$('#layers_tab').height());
  config.programLoop = setInterval(function () {
    config.programLoopFunction();
  }, settings.frameRate);
  $('#toolbar .tools').click(function () {
    $('#toolbar .tools').removeClass('selected');
    $('#toolbar .tools').css('opacity', 0.5);
    $('#toolbar .tools').css('border-left', 'none');
    $(this).addClass('selected');
    $(this).css('opacity', 1);
    $(this).css('border-left', '2px solid #fff');
    system.current_tool = $(this).attr('id');
    switch(system.current_tool) {
      case 'add_rectangle': system.current_tool = 'add_object'; system.changeDrawMode('rectangle'); break;
      case 'add_circle': system.current_tool = 'add_object'; system.changeDrawMode('circle'); break;
      case 'add_line': system.current_tool = 'add_object'; system.changeDrawMode('line'); break;
    }
  })
  $('#toolbar #select_object').click();

  // global hotkeys
  $(document).on('keydown', function (event) {
    if(event.target.tagName == 'BODY') {
    if((event.which >= 48 && event.which <= 57)) {
      system.input += String.fromCharCode(event.which);
    }
    if(event.which == 190) {
      system.input += '.';
    }
    // backspace
    if(event.which == 8) {
      system.input = system.input.slice(0, -1);
    }
    
    // esc
    if(event.keyCode == 27) {
      system.cancleAll();
    }

    // ctrl + 0
    if(event.ctrlKey && event.keyCode == 48) {
      system.fitScreen();
    } 
    
    // Home
    if(event.keyCode == 36) {
      preview.times = 0;
      drawing();
      recordCanvas();
    }

    // End
    if(event.keyCode == 35) {
      preview.times = video.maxTimes;
      drawing();
      recordCanvas();
    }

    // page down
    if(event.keyCode == 34) {
      if(event.shiftKey) {
        preview.times += 10000;
      } else if(event.ctrlKey) {
        preview.times += 100;
      } else {
        preview.times += 1000;
      }
      drawing();
      recordCanvas();
    }

    // page up
    if(event.keyCode == 33) {
      if(event.shiftKey) {
        preview.times -= 10000;
      } else if(event.ctrlKey) {
        preview.times -= 100;
      } else {
        preview.times -= 1000;
      }
      drawing();
      recordCanvas();
    }

    // ctrl + [
    if(event.keyCode == 219 && event.ctrlKey) {
      for(let i = 0; i<system.selectedObject.length; i++) {
        let pos = video.layers[system.current_layer].objects.indexOf(system.selectedObject[i]);
        arrayPos(video.layers[system.current_layer].objects, pos, pos-1)
      }
      drawing();
    }
    
    // ctrl + ]
    if(event.keyCode == 221 && event.ctrlKey) {
      for(let i = 0; i<system.selectedObject.length; i++) {
        let pos = video.layers[system.current_layer].objects.indexOf(system.selectedObject[i]);
        arrayPos(video.layers[system.current_layer].objects, pos, pos+1)
      }
      drawing();
    }
    
    // ctrl + shift + z
    if(event.ctrlKey && event.shiftKey && event.keyCode == 90) {
      if(system.now_log < system.logs.length - 1) {
        system.now_log += 1;
        gotoLog(system.now_log)
        // video = _.cloneDeep(system.logs[system.now_log].video);
        // drawing();
      }
      // ctrl + z
    } else if(event.ctrlKey && event.keyCode == 90) {
      if(system.now_log > 0) {
        system.now_log -= 1;
        gotoLog(system.now_log)
        // video = _.cloneDeep(system.logs[system.now_log].video);
        // drawing();
      }
    }

    // delete key
    if(selects.length > 0 && event.keyCode == 46) {
      for(let i = 0; i<selects.length; i++) {
        deleteArray(video.layers[system.current_layer].objects, selects[i]);
      }
      system.selectedObject = [];
      newLog();
    }
    if(!system.doing[0]) {
      if(event.keyCode == 65 && event.ctrlKey) {
        for(let i = 0; i<objs.length; i++) {
          if(!objs[i].isSelected) {
            objs[i].isSelected = true;
            selects.push(objs[i]);
          }
        }
      // press R
      }
      if(event.keyCode == 82) {
        $('#toolbar #add_rectangle').click();
      }
      // press C
      if(event.keyCode == 67) {
        $('#toolbar #add_circle').click();
      }
      // press l
      if(event.keyCode == 76) {
        $('#toolbar #add_line').click();
      }
      // press V
      if(event.keyCode == 86) {
        $('#toolbar #select_object').click();
      }
      // enter
      if(event.keyCode == 13) {
        system.start();
      }
    }

    system.keyboard.altKey = event.altKey;
    system.keyboard.ctrlKey = event.ctrlKey;
    system.keyboard.shiftKey = event.shiftKey;
    system.keyboard.enterKey = event.keyCode == 13;
    system.keyboard.spaceKey = event.keyCode == 32;

    // 브라우저 단축키 블락
    } else if($('.interface_tab:visible')[0]) {
      if(event.keyCode == 13) {
        $('.interface_tab:visible .apply').click();
      }
      if(event.keyCode == 27) {
        $('.interface_tab:visible .quit_tab').click();
      }
    } else if($(event.target).parents('#object_information').length > 0) {
      if(event.keyCode == 13) {
        $(event.target).parents('#object_information').children('.apply').click();
      }
    }
    if(event.ctrlKey || event.altKey || event.shiftKey || event.keyCode == 13 || event.keyCode == 32 || event.keyCode == 116) {
      event.preventDefault();
    }
  })
  
  $(document).on('keyup', function (event) {
    setTimeout(function () {
      system.keyboard.altKey = event.altKey;
      system.keyboard.ctrlKey = event.ctrlKey;
      system.keyboard.shiftKey = event.shiftKey;
    }, 1)
    system.keyboard.enterKey = event.keyCode == 13 ? false : system.keyboard.enterKey;
    system.keyboard.spaceKey = event.keyCode == 32 ? false : system.keyboard.spaceKey;
  })

  $(document).on('mousedown', function (event) {
    system.pointer.down.x = system.pointer.current.x;
    system.pointer.down.y = system.pointer.current.y;
    system.pointer.down.which = event.which; // 1: left, 2: middle, 3: right
    system.pointer.isDown = true;
  })
  
  $(document).on('mousemove', function (event) {
    system.pointer.current.x = event.clientX;
    system.pointer.current.y = event.clientY;
    if(system.pointer.onTimeInterfaceDown) {
      preview.times = system.pointer.onTimeInterfaceTime + (event.clientX - system.pointer.down.x)/window.innerWidth * video.maxTimes;
      // system.cursor = 'ew-resize';
      if(event.ctrlKey) {
        preview.times = Math.floor(preview.times / 500) * 500;
      }
    }

    // drawing_magnetic
    if(!system.keyboard.ctrlKey && !system.doing.includes('moving_object') && !system.pointer.onTimeInterfaceDown) {
      for(let i = 0; i<objs.length; i++) {
        if(objs[i].property.visible) {
          if(Math.abs(system.pointer.current.x - objs[i].clientX) < 8) {
            system.pointer.current.x = objs[i].clientX;
          }
          if(Math.abs(system.pointer.current.x - (objs[i].clientX + objs[i].property.width * preview.zoom)) < 8) {
            system.pointer.current.x = objs[i].clientX + objs[i].property.width * preview.zoom;
          }
          if(Math.abs(system.pointer.current.y - objs[i].clientY) < 8) {
            system.pointer.current.y = objs[i].clientY;
          }
          if(Math.abs(system.pointer.current.y - (objs[i].clientY + objs[i].property.height * preview.zoom)) < 8) {
            system.pointer.current.y = objs[i].clientY + objs[i].property.height * preview.zoom;
          }
        }
      }
    }
  })

  $(document).on('mouseup', function (event) {
    system.pointer.up.x = system.pointer.current.x;
    system.pointer.up.y = system.pointer.current.y;
    system.pointer.up.which = event.which; // 1: left, 2: middle, 3: right

    if(system.doing.includes('select_object_dragging')) {
      let px1 = system.pointer.down.offsetX / preview.zoom;
      let py1 = system.pointer.down.offsetY / preview.zoom;
      let px2 = system.pointer.up.offsetX / preview.zoom;
      let py2 = system.pointer.up.offsetY / preview.zoom;
      if(px1 > px2) {let px = px1; px1 = px2; px2 = px;}
      if(py1 > py2) {let py = py1; py1 = py2; py2 = py;}
      if((py2 - py1 > 2) && (px2 - px1 > 2)) {
        for(let i = 0; i < objs.length; i++) {
          if(objs[i].property.x > px1 && objs[i].property.x + objs[i].property.width < px2 &&
          objs[i].property.y > py1 && objs[i].property.y + objs[i].property.height < py2) {
            console.log(objs[i])
            objs[i].isSelected = true;
            selects.push(objs[i]);
          } else {
            if(!system.keyboard.altKey) {
              objs[i].isSelected = false;
            }
          }
        }
      }
      deleteArray(system.doing, 'select_object_dragging')
    }
  })

  $('#menu .show_layers_tab').on('click', function (event) {
    $(this).toggleClass('active');
    if($(this).hasClass('active')) {
      $('#layers_tab').css('top', '33px');
    } else {
      $('#layers_tab').css('top', -$('#layers_tab').height());
    }
  })

  // run preview
  $('#menu .start_button').on('click', function (event) {
    system.start();
  })

  $('#video_preview_cover').on('mousedown', function (event) {
    system.pointer.down.offsetX = system.pointer.current.offsetX;
    system.pointer.down.offsetY = system.pointer.current.offsetY;
    system.pointer.down.which = event.which;
    if(system.pointer.down.which == 1) {
      
      // 스포이드 만들기
      if(system.doing.includes('picking_color')) {
        for(let i = 0; i < objs.length; i++) {
          if(objs[i].onMouse) {
            if(selects.indexOf(objs[i]) == -1) {
              system.changeColor(objs[i].property.backgroundColor);
            }
          }
        }
      } else {
      if(system.current_tool == 'add_object') {
        system.doing.push('draw_object')
      }
      if(system.current_tool == 'select_object') {
        let selectAnything = false;
        if(system.keyboard.altKey) {
          for(let i = 0; i < objs.length; i++) {
            if(objs[i].onMouse) {
              if(selects.indexOf(objs[i]) == -1) {
                selects.push(objs[i]);
                objs[i].isSelected = true;
              }
            }
          }
        } else {
          for(let i = 0; i < objs.length; i++) {
            if(objs[i].onMouse) {
              system.selectedObject = [objs[i]];
              objs[i].isSelected = true;
              selectAnything = true;
            } else {
              objs[i].isSelected = false;
            }
          }
          if(!selectAnything) {
            // if(system.doing.indexOf('move_object') != -1) {
            //   for(let i of system.selectedObject) {
            //     i.property = _.cloneDeep(i.before);
            //   }
            // }
            if(system.doing.indexOf('move_object') == -1) {
              system.selectedObject = [];
            }
          }
        }
        if(!system.doing.includes('move_object')) {
          system.doing.push('select_object_dragging')
        }
      }
      }
    }

    if(system.keyboard.spaceKey) {
      system.doing.push('move_canvas');
      preview.before = {
        x: preview.position.x,
        y: preview.position.y
      }
    }
  })

  $('#video_preview_cover').on('mouseup', function (event) {
    system.pointer.up.offsetX = system.pointer.current.offsetX;
    system.pointer.up.offsetY = system.pointer.current.offsetY;
    system.pointer.up.which = event.which;
    // drawing object
    if(system.pointer.down.which == 1 && system.pointer.up.which == 1) {
      system.delayFunction.push(function () {
        if(system.doing.indexOf('draw_object') != -1) {
          let x = Math.round(system.pointer.down.offsetX / preview.zoom);
          let y = Math.round(system.pointer.down.offsetY / preview.zoom);
          let width = Math.round((system.pointer.current.offsetX - system.pointer.down.offsetX) / preview.zoom);
          let height = Math.round((system.pointer.current.offsetY - system.pointer.down.offsetY) / preview.zoom);
          if(system.keyboard.shiftKey) {
            Math.abs(width) < Math.abs(height) ? 
            (height = width * (width * height < 0 ? -1 : 1)) : (width = height * (width * height < 0 ? -1 : 1));
          }
          if(Math.abs(width) > 2 / preview.zoom || Math.abs(height) > 2 / preview.zoom) { // 실수 방지
            new VectorObject(x, y, width, height, system.drawMode)
          }
          deleteArray(system.doing, 'draw_object')
        }
      })
    }

    // move canvas
    if(system.doing.includes('move_canvas')) {
      deleteArray(system.doing, 'move_canvas')
    }
  })
  
  $('#video_preview_cover').on('mousemove', function (event) {

    let isCursorPointer = false;

    system.pointer.current.offsetX = event.offsetX - config.canvas.canvas.position().left + $('#toolbar').width();
    system.pointer.current.offsetY = event.offsetY - config.canvas.canvas.position().top;

    if(system.current_tool == 'select_object') {
      for(let i = 0; i<video.layers[system.current_layer].objects.length; i++) {
        var obj = video.layers[system.current_layer].objects[i];
        if(system.pointer.current.x >= obj.clientX && system.pointer.current.x <= obj.clientX + obj.property.width * preview.zoom && system.pointer.current.y >= obj.clientY && system.pointer.current.y <= obj.clientY + obj.property.height * preview.zoom) {
          obj.onMouse = true;
        } else {
          obj.onMouse = false;
        }
      }
      
    }

    if(system.doing.indexOf('draw_object') != -1) {
      if(event.offsetX < 10) {
        preview.position.x -= 10;
      }
      if(event.offsetX > $('#video_preview_cover').width() - 10) {
        preview.position.x += 10;
      }
      if(event.offsetY < 10) {
        preview.position.y -= 10;
      }
      if(event.offsetY > $('#video_preview_cover').height() - 32) {
        preview.position.y += 10;
      }
    }
  })
  
  $('#time_interface').on('mousedown', function (event) {
    if(preview.onStart) {
      system.start()
    }
    system.pointer.onTimeInterfaceDown = true;
    system.pointer.onTimeInterfaceTime = preview.times;
    // $('#time_interface #current_time_stick').css('border', '1px solid #888');
    $('#time_interface #current_time_stick').css('height', window.innerHeight+'px');
    $('#time_interface #current_time_stick').css('width', '1px');
    $('#time_interface #current_time_stick').css('border-radius', '0px');
    $('#time_interface #current_time_stick').css('bottom', '-4px');
    $('#video_preview_cover').css('opacity', 0.5);
    system.cancleAll();
  })
  
  $(document).on('mouseup', function (event) {
    system.pointer.isDown = false;
    if(system.pointer.onTimeInterfaceDown) {
      system.pointer.onTimeInterfaceDown = false;
      recordCanvas();
      // $('#time_interface #current_time_stick').css('border', 'none');
      $('#time_interface #current_time_stick').css('height', '14px');
      $('#time_interface #current_time_stick').css('width', '1px');
      $('#time_interface #current_time_stick').css('border-radius', '8px');
      $('#time_interface #current_time_stick').css('bottom', '-4px');
      $('#video_preview_cover').css('opacity', 0);
    }
  })
  
  $('#time_interface .end_time').hover(() => {
    system.showRemainTime = true;
  }, () => {
    system.showRemainTime = false;
  })

  $('#video_preview_cover').on('wheel', function (event) {
    if(event.shiftKey) {
      preview.position.x += event.originalEvent.deltaY / preview.zoom * settings.zoom_level * 10;
    } else if(event.altKey || event.ctrlKey) {
      if(event.originalEvent.deltaY < 0) {
        // wheeled up
        preview.zoom += settings.zoom_level;
      } else if(event.originalEvent.deltaY > 0) {
        // wheeled down
        preview.zoom -= settings.zoom_level;
      }
    } else {
      preview.position.y += event.originalEvent.deltaY / preview.zoom * settings.zoom_level * 10;
    }
    
    if(preview.zoom < 0.01) preview.zoom = 0.01
    if(preview.zoom > 8) preview.zoom = 8
    if(preview.position.x > 800) preview.position.x = 800
    if(preview.position.x < -800) preview.position.x = -800
    if(preview.position.y > 800) preview.position.y = 800
    if(preview.position.y < -800) preview.position.y = -800

    event.preventDefault();
  })

  newLog();
}

config.programLoopFunction = function () {
  // fps 조정
  // system.programTimeDifference = system.programRunTime - system.programLoopRunTime;
  // system.programRunTime = new Date().getTime() - system.programOpenTime;
  // system.programLoopRunTime += settings.frameRate;
  // system.currentFPS = 1000 / settings.frameRate;
  
  // if(settings.autoFPS && preview.onStart) {
  //   if(settings.frameRate > 0) {
  //     if(Math.abs(system.programRunTime - system.programLoopRunTime - system.programTimeDifference) < 2) {
  //       settings.setFrameRate(settings.frameRate - 0.01);
  //     } else {
  //       settings.setFrameRate(settings.frameRate + (0.02 * system.currentFPS / 60) * (system.programRunTime - system.programLoopRunTime - system.programTimeDifference));
  //     }
  //   }
  //   system.lastFrameRate = settings.frameRate;
  // } else if(settings.autoFPS) {
  //   settings.setFrameRate(1000/60)
  // }

  if(preview.onStart || system.pointer.onTimeInterfaceDown) {
    drawing();
  }

  if(!system.isRecording) {
  $('#fakeCanvas')[0].width = $('#video_preview_cover').width();
  $('#fakeCanvas')[0].height = $('#video_preview_cover').height();
  $('#fakeCanvas').width($('#fakeCanvas')[0].width);
  $('#fakeCanvas').height($('#fakeCanvas')[0].height);

  $('#clr-picker').hasClass('clr-open') ? (!system.doing.includes('picking_color') ? system.doing.push('picking_color') : false) : deleteArray(system.doing, 'picking_color');
  
  $(document).css('cursor', system.cursor);
  $('#video_preview_cover').css('cursor', system.cursor);
  system.cursor = 'default'
  
  objs = video.layers[system.current_layer].objects;

  system.transformedAnything = false;

  if(system.doing.includes('move_object') && system.doing.includes('draw_object')) {
    system.cancleAll();
    system.doing.push('draw_object')
    // deleteArray(system.doing, 'move_object');
  }

  for(let i = 0; i < video.layers.length; i++) {
    for(let j = 0; j < video.layers[i].objects.length; j++) {
      let obj = video.layers[i].objects[j];
      if(obj.property.visible) {
        obj.clientX = obj.property.x * preview.zoom + config.canvas.canvas.position().left;
        obj.clientY = obj.property.y * preview.zoom + config.canvas.canvas.position().top + 32;
        if(!_.isEqual(obj.property, obj.before)) {
          obj.isTransformed = true;
          system.transformedAnything = true;
        } else {
          obj.isTransformed = false;
        }
        if(obj.isSelected || obj.onMouse || obj.isTransformed) {
          system.fakeCtx.strokeStyle = '#ff000080';
          if(obj.isTransformed) system.fakeCtx.strokeStyle = '#00f'
          if(obj.isTransformed && obj.isSelected) system.fakeCtx.strokeStyle = '#f0f'
          system.fakeCtx.lineWidth = 1;
          let x = obj.clientX - $('#video_preview_cover').position().left;
          let y = obj.clientY - 32;
          let width = obj.property.width * preview.zoom;
          let height = obj.property.height * preview.zoom;
          system.fakeCtx.strokeRect(x, y, width, height);
          system.fakeCtx.beginPath();
          system.fakeCtx.moveTo(x, y);
          system.fakeCtx.lineTo(x + width, y + height);
          system.fakeCtx.stroke();
          system.fakeCtx.beginPath();
          system.fakeCtx.moveTo(x + width, y);
          system.fakeCtx.lineTo(x, y + height);
          system.fakeCtx.stroke();
        }
        // 오브젝트 클릭
        if(obj.onMouse && obj.isSelected) {
          system.cursor = 'move';
          if(system.pointer.isDown && system.pointer.down.which == 1) {
            if(Math.abs(system.pointer.down.x - system.pointer.current.x) > 3 || Math.abs(system.pointer.down.y - system.pointer.current.y) > 3) {
              system.doing.includes('move_object') ? null : system.doing.push('move_object');
              system.doing.includes('moving_object') ? null : system.doing.push('moving_object');
            }
          }
        }
      }
    }
  }

  // guideline
  if(!system.keyboard.ctrlKey && system.current_tool == 'add_object') {
    if(Math.abs(system.pointer.current.offsetX) < 8) {
      system.pointer.current.offsetX = 0;
      system.pointer.current.x = config.canvas.canvas.position().left;
      guidelineX(0);
    }
    if(Math.abs(system.pointer.current.offsetX - config.canvas.canvas.width()) < 8) {
      system.pointer.current.offsetX = config.canvas.canvas.width();
      system.pointer.current.x = config.canvas.canvas.position().left + config.canvas.canvas.width();
      guidelineX(config.canvas.width);
    }
    // if(Math.abs(system.pointer.current.offsetX - config.canvas.canvas.width()/2) < 8) {
    //   system.pointer.current.offsetX = config.canvas.canvas.width()/2;
    //   system.pointer.current.x = config.canvas.canvas.position().left + config.canvas.canvas.width()/2;
    //   guidelineX(config.canvas.width/2);
    // }
    if(Math.abs(system.pointer.current.offsetY) < 8) {
      system.pointer.current.offsetY = 0;
      system.pointer.current.y = config.canvas.canvas.position().top + 32;
      guidelineY(0);
    }
    if(Math.abs(system.pointer.current.offsetY - config.canvas.canvas.height()) < 8) {
      system.pointer.current.offsetY = config.canvas.canvas.height();
      system.pointer.current.y = config.canvas.canvas.position().top + 32 + config.canvas.canvas.height();
      guidelineY(config.canvas.height);
    }
    // if(Math.abs(system.pointer.current.offsetY - config.canvas.canvas.height()/2) < 8) {
    //   system.pointer.current.offsetY = config.canvas.canvas.height()/2;
    //   system.pointer.current.y = config.canvas.canvas.position().top + 32 + config.canvas.canvas.height()/2;
    //   guidelineY(config.canvas.height/2);
    // }

    for(let i = 0; i<objs.length; i++) {
      if(objs[i].property.visible) {
        if(Math.abs(system.pointer.current.x - objs[i].clientX) < 8) {
          system.pointer.current.offsetX = objs[i].property.x * preview.zoom;
          system.pointer.current.x = objs[i].clientX;
          guidelineX(objs[i].property.x);
        }
        if(Math.abs(system.pointer.current.x - (objs[i].clientX + objs[i].property.width * preview.zoom)) < 8) {
          system.pointer.current.offsetX = (objs[i].property.x + objs[i].property.width) * preview.zoom;
          system.pointer.current.x = objs[i].clientX + objs[i].property.width * preview.zoom;
          guidelineX(objs[i].property.x + objs[i].property.width);
        }
        if(Math.abs(system.pointer.current.y - objs[i].clientY) < 8) {
          system.pointer.current.offsetY = objs[i].property.y * preview.zoom;
          system.pointer.current.y = objs[i].clientY;
          guidelineY(objs[i].property.y);
        }
        if(Math.abs(system.pointer.current.y - (objs[i].clientY + objs[i].property.height * preview.zoom)) < 8) {
          system.pointer.current.offsetY = (objs[i].property.y + objs[i].property.height) * preview.zoom;
          system.pointer.current.y = objs[i].clientY + objs[i].property.height * preview.zoom;
          guidelineY(objs[i].property.y + objs[i].property.height);
        }
      }
    }
  }

  if(system.doing.includes('moving_object')) {
    system.cursor = 'move';
    
    let moveX = (system.pointer.current.x - system.pointer.down.x) / preview.zoom;
    let moveY = (system.pointer.current.y - system.pointer.down.y) / preview.zoom;
    if(system.keyboard.shiftKey) {
      Math.abs(moveX) > Math.abs(moveY) ? moveY = 0 : moveX = 0;
    }
    for(let i = 0; i < selects.length; i++) {
      selects[i].property.x = Math.round(selects[i].before.x + selects[i].transform.x + moveX);
      selects[i].property.y = Math.round(selects[i].before.y + selects[i].transform.y + moveY);
      if(!system.keyboard.ctrlKey) {
        if(Math.abs(selects[i].property.x) < 8) {
          selects[i].property.x = 0;
          guidelineX(selects[i].property.x);
        }
        if(Math.abs(config.canvas.width - selects[i].property.x) < 8) {
          selects[i].property.x = config.canvas.width;
          guidelineX(selects[i].property.x);
        }
        if(Math.abs(selects[i].property.y) < 8) {
          selects[i].property.y = 0;
          guidelineY(selects[i].property.y);
        }
        if(Math.abs(config.canvas.height - selects[i].property.y) < 8) {
          selects[i].property.y = config.canvas.height;
          guidelineY(selects[i].property.y);
        }
        if(Math.abs(selects[i].property.x + selects[i].property.width) < 8) {
          selects[i].property.x = -selects[i].property.width;
          guidelineX(selects[i].property.x+selects[i].property.width);
        }
        if(Math.abs(config.canvas.width - (selects[i].property.x + selects[i].property.width)) < 8) {
          selects[i].property.x = config.canvas.width - selects[i].property.width;
          guidelineX(selects[i].property.x+selects[i].property.width);
        }
        if(Math.abs(selects[i].property.y + selects[i].property.height) < 8) {
          selects[i].property.y = -selects[i].property.height;
          guidelineY(selects[i].property.y+selects[i].property.height);
        }
        if(Math.abs(config.canvas.height - (selects[i].property.y + selects[i].property.height)) < 8) {
          selects[i].property.y = config.canvas.height - selects[i].property.height;
          guidelineY(selects[i].property.y+selects[i].property.height);
        }
        if(Math.abs(selects[i].property.x + selects[i].property.width/2 - config.canvas.width/2) < 8) {
          selects[i].property.x = config.canvas.width/2 - selects[i].property.width/2;
          guidelineX(selects[i].property.x+selects[i].property.width/2);
        }
        if(Math.abs(selects[i].property.y + selects[i].property.height/2 - config.canvas.height/2) < 8) {
          selects[i].property.y = config.canvas.height/2 - selects[i].property.height/2;
          guidelineY(selects[i].property.y+selects[i].property.height/2);
        }
        
        for(let j = 0; j < objs.length; j++) {
          if(objs[j] != selects[i] && objs[j].property.visible) {
            if(Math.abs(selects[i].property.x - objs[j].property.x) < 8) {
              selects[i].property.x = objs[j].property.x;
              guidelineX(selects[i].property.x);
            }
            if(Math.abs((selects[i].property.x + selects[i].property.width) - objs[j].property.x) < 8) {
              selects[i].property.x = objs[j].property.x - selects[i].property.width;
              guidelineX(selects[i].property.x + selects[i].property.width);
            }
            if(Math.abs(selects[i].property.x - (objs[j].property.x + objs[j].property.width)) < 8) {
              selects[i].property.x = objs[j].property.x + objs[j].property.width;
              guidelineX(selects[i].property.x);
            }
            if(Math.abs((selects[i].property.x + selects[i].property.width) - (objs[j].property.x + objs[j].property.width)) < 8) {
              selects[i].property.x = objs[j].property.x + objs[j].property.width - selects[i].property.width;
              guidelineX(selects[i].property.x + selects[i].property.width);
            }
            if(Math.abs(selects[i].property.y - objs[j].property.y) < 8) {
              selects[i].property.y = objs[j].property.y;
              guidelineY(selects[i].property.y);
            }
            if(Math.abs((selects[i].property.y + selects[i].property.height) - objs[j].property.y) < 8) {
              selects[i].property.y = objs[j].property.y - selects[i].property.height;
              guidelineY(selects[i].property.y + selects[i].property.height);
            }
            if(Math.abs(selects[i].property.y - (objs[j].property.y + objs[j].property.height)) < 8) {
              selects[i].property.y = objs[j].property.y + objs[j].property.height;
              guidelineY(selects[i].property.y);
            }
            if(Math.abs((selects[i].property.y + selects[i].property.height) - (objs[j].property.y + objs[j].property.height)) < 8) {
              selects[i].property.y = objs[j].property.y + objs[j].property.height - selects[i].property.height;
              guidelineY(selects[i].property.y + selects[i].property.height);
            }
            if(Math.abs(selects[i].property.x + selects[i].property.width/2 - objs[j].property.x - objs[j].property.width/2) < 8) {
              selects[i].property.x = objs[j].property.x + objs[j].property.width/2 - selects[i].property.width/2;
              guidelineX(selects[i].property.x+selects[i].property.width/2);
            }
            if(Math.abs(selects[i].property.y + selects[i].property.height/2 - objs[j].property.y - objs[j].property.height/2) < 8) {
              selects[i].property.y = objs[j].property.y + objs[j].property.height/2 - selects[i].property.height/2;
              guidelineY(selects[i].property.y+selects[i].property.height/2);
            }
          }
        }
      }
      if(!system.pointer.isDown) {
        selects[i].transform.x += moveX;
        selects[i].transform.y += moveY;
        deleteArray(system.doing, 'moving_object');
      }
    }
  }

  if(system.keyboard.enterKey) {
    // if(system.doing.includes('move_object')) {
    //   if(system.keyboard.altKey) {
    //     let addSelects = [];
    //     let objsLength = objs.length;
    //     for(let i = 0; i<objsLength; i++) {
    //       if(objs[i].isTransformed) {
    //         let cloneSelect = _.cloneDeep(objs[i]);
    //         addTimeline(cloneSelect, {
    //           x: cloneSelect.property.x,
    //           y: cloneSelect.property.y,
    //         }, null, null, false)
    //         for(let j = 0; j < keys(cloneSelect.transform).length; j++) {
    //           cloneSelect.transform[keys(cloneSelect.transform)[j]] = 0;
    //           objs[i].transform[keys(objs[i].transform)[j]] = 0;
    //         }
    //         video.layers[system.current_layer].objects.push(cloneSelect);
    //         addSelects.push(cloneSelect);
    //       }
    //     }
    //     system.selectedObject = selects.concat(addSelects);
      // } else if(!_.isNaN(Number(system.input)) && Number(system.input) > 0) {
      //   const systemInput = Number(system.input);
      //   const currentTimes = preview.times;
      //   for(let i = 0; i<objs.length; i++) {
      //     const fromX = objs[i].before.x;
      //     const fromY = objs[i].before.y;
      //     const toX = objs[i].property.x;
      //     const toY = objs[i].property.y;
      //     if(objs[i].isTransformed) {
      //       addFunc(objs[i], function (obj) {
      //         if(currentTimes - systemInput <= preview.times && preview.times <= currentTimes) {
      //           obj.property.x = fromX + (toX - fromX) * (1 - (currentTimes - preview.times) / systemInput);
      //           obj.property.y = fromY + (toY - fromY) * (1 - (currentTimes - preview.times) / systemInput);
      //         }
      //       }, null, false);
      //       addTimeline(objs[i], {
      //         x: objs[i].property.x,
      //         y: objs[i].property.y,
      //       }, null, null, false);
      //     } 
      //   }
      //   system.input = '';
      // } else {
    //     for(let i = 0; i<objs.length; i++) {
    //       if(objs[i].isTransformed) {
    //         addTimeline(objs[i], {
    //           x: objs[i].property.x,
    //           y: objs[i].property.y,
    //         }, null, null, false)
    //         for(let j = 0; j < keys(objs[i].transform).length; j++) {
    //           objs[i].transform[keys(objs[i].transform)[j]] = 0;
    //         }
    //       }
    //     }
    //   }
    //   newLog();
    //   deleteArray(system.doing, 'move_object');
    // }
    if(system.transformedAnything) {
      if(system.keyboard.altKey) {

      } else if(!_.isNaN(Number(system.input)) && Number(system.input) > 0) {
        const systemInput = Number(system.input);
        const currentTimes = preview.times;
        for(let i = 0; i<objs.length; i++) {
          if(objs[i].isTransformed) {
            let transProps = {}
            let transBefores = {}
            for(let j = 0; j < keys(objs[i].property).length; j++) {
              let propertyName = keys(objs[i].property)[j];
              if(objs[i].property[propertyName] != objs[i].before[propertyName]) {
                transProps[propertyName] = objs[i].property[propertyName];
                transBefores[propertyName] = objs[i].before[propertyName];
                objs[i].transform[propertyName] = 0;
              }
            }
            addFunc(objs[i], function (obj) {
              if(currentTimes - systemInput <= preview.times && preview.times <= currentTimes) {
                for(let j = 0; j < keys(transProps).length; j++) {
                  let propertyName = keys(transProps)[j];
                  if(typeof transProps[propertyName] == 'string' ? transProps[propertyName].indexOf('#') == 0 : false) {
                    const color_r = Math.floor(getR(transBefores[propertyName]) + (getR(transProps[propertyName]) - getR(transBefores[propertyName])) * (1 - (currentTimes - preview.times) / systemInput));
                    const color_g = Math.floor(getG(transBefores[propertyName]) + (getG(transProps[propertyName]) - getG(transBefores[propertyName])) * (1 - (currentTimes - preview.times) / systemInput));
                    const color_b = Math.floor(getB(transBefores[propertyName]) + (getB(transProps[propertyName]) - getB(transBefores[propertyName])) * (1 - (currentTimes - preview.times) / systemInput));
                    obj.property[propertyName] = '#'+fillZero((color_r).toString(16))+fillZero((color_g).toString(16))+fillZero((color_b).toString(16));
                  } else {
                    obj.property[propertyName] = Math.round((transBefores[propertyName] + (transProps[propertyName] - transBefores[propertyName]) * (1 - (currentTimes - preview.times) / systemInput))*100)/100;
                  }
                }
              }
            }, null, false);
            addTimeline(objs[i], transProps, null, null, false);
          } 
        }
        system.input = '';
      } else {
        for(let i = 0; i < objs.length; i++) {
          if(objs[i].isTransformed) {
            let transProps = {}
            for(let j = 0; j < keys(objs[i].property).length; j++) {
              let propertyName = keys(objs[i].property)[j];
              if(objs[i].property[propertyName] != objs[i].before[propertyName]) {
                // if(objs[i].fixed_ratio) {
                //   if(propertyName == 'width') {
                //     transProps.height = objs[i].property.width * objs[i].property.ratio;
                //   }
                //   if(propertyName == 'height') {
                //     transProps.width = objs[i].property.height / objs[i].property.ratio;
                //   }
                // }
                transProps[propertyName] = objs[i].property[propertyName];
                objs[i].transform[propertyName] = 0;
              }
            }
            addTimeline(objs[i], transProps, null, null, false);
          }
        }
      }
      if(system.doing.includes('move_object')) deleteArray(system.doing, 'move_object');
      newLog();
    }
  }

  // drawing object - preview
  if(system.doing.indexOf('draw_object') != -1) {
    if(system.pointer.down.which == 1) {
      let x = Math.round(system.pointer.down.x - 48);
      let y = Math.round(system.pointer.down.y - 32);
      let width = Math.round(system.pointer.current.x - system.pointer.down.x);
      let height = Math.round(system.pointer.current.y - system.pointer.down.y);
      if(system.keyboard.shiftKey) {
        Math.abs(width) < Math.abs(height) ? 
        (height = width * (width * height < 0 ? -1 : 1)) : (width = height * (width * height < 0 ? -1 : 1));
      }
  
      system.fakeCtx.strokeStyle = '#f00';
      system.fakeCtx.lineWidth = 1;
      if(system.drawMode == 'rectangle') {
        system.fakeCtx.strokeRect(x, y, width, height)
      } else if(system.drawMode == 'circle') {
        if(width < 0) {
          x += width;
          width *= -1;
        }
        if(height < 0) {
          y += height;
          height *= -1;
        }
        system.fakeCtx.beginPath();
        system.fakeCtx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
        system.fakeCtx.stroke();
      } else if(system.drawMode == 'line') {
        system.fakeCtx.beginPath();
        system.fakeCtx.moveTo(x, y);
        system.fakeCtx.lineTo(system.pointer.current.x - 48, system.pointer.current.y - 32);
        system.fakeCtx.stroke();
      }
    }
  }
  
  // select drag
  if(system.doing.indexOf('select_object_dragging') != -1) {
    if(system.pointer.down.which == 1) {
      let x = Math.round(system.pointer.down.x - 48);
      let y = Math.round(system.pointer.down.y - 32);
      let width = Math.round(system.pointer.current.x - system.pointer.down.x);
      let height = Math.round(system.pointer.current.y - system.pointer.down.y);
      
      system.fakeCtx.strokeStyle = '#00ffff80';
      system.fakeCtx.fillStyle = '#00ffff20';
      system.fakeCtx.lineWidth = 1;
      system.fakeCtx.fillRect(x, y, width, height)
      system.fakeCtx.strokeRect(x, y, width, height)
    }
    if(system.doing.includes('move_object')) {
      deleteArray(system.doing, 'select_object_dragging');
    }
  }
  
  // preview zoom
  config.canvas.canvas.height(config.canvas.height * preview.zoom);
  config.canvas.canvas.css('transform','translate(' + (- 50 - preview.position.x * settings.zoom_level) + '%, ' + (- 50 - preview.position.y * settings.zoom_level) + '%)');
  
  $('#video_information').html(createTable(
    ['input:', system.input],
    ['zoom:', Math.round(preview.zoom*10000)/100 + '%'],
  ))
  if(preview.zoom < 0.01) preview.zoom = 0.01
  if(preview.zoom > 8) preview.zoom = 8
  if(preview.position.x > 800) preview.position.x = 800
  if(preview.position.x < -800) preview.position.x = -800
  if(preview.position.y > 800) preview.position.y = 800
  if(preview.position.y < -800) preview.position.y = -800

  // move canvas
  if(system.doing.includes('move_canvas') && system.keyboard.spaceKey && system.pointer.isDown) {
    preview.position.x = (preview.before.x - (system.pointer.current.offsetX - system.pointer.down.offsetX));
    preview.position.y = (preview.before.y - (system.pointer.current.offsetY - system.pointer.down.offsetY));
  }

  // color picker
  system.mainColor = $('#color_picker input')[0].value;
  if(selects.length > 0 && $('#clr-picker').hasClass('clr-open')) {
    for(let i = 0; i < selects.length; i++) {
      selects[i].property.backgroundColor = system.mainColor;
      // selects[i].addTimeline({
      //   backgroundColor: system.mainColor,
      // }, 0)
    }
  }

  // tools
  if(system.current_tool == 'add_object') {
    system.cursor = 'crosshair';
  }
  
  if(system.pointer.onTimeInterfaceDown) {
    system.cursor = 'ew-resize';
  }

  if(system.doing.includes('move_canvas')) {
    system.cursor = 'grab';
  }

  for(let i = 0; i<system.delayFunction.length; i++) {
    system.delayFunction[i]();
  }

  selects = system.selectedObject;

  if(selects[selects.length - 1] == null) {
    $('#object_information').hide();
  } else {
    if(system.selectClone == null ? true : !_.isEqual(system.selectClone.property, selects[selects.length - 1].property)) {
      system.selectClone = _.cloneDeep(selects[selects.length - 1]);
      $('#object_information table').html('');
      $('#object_information').show();
      $('#object_information .title').text(system.selectClone.type.join(' '));
      for(let i = 0; i < keys(system.selectClone.property).length; i++) {
        let newTableElm = $('<tr><td></td><td contenteditable></td></tr>');
        let propertyName = keys(system.selectClone.property)[i];
        let value = system.selectClone.property[propertyName];
        $('#object_information table').append(newTableElm)
        if(type(value) == 'array') {
          value = value.join(', ')
        }
        if(type(value) == 'number') {
          value = (Math.round(value*100))/100
        }
        if(value.toString().length > 11) {
          value = value.toString().substr(0, 11) + '...'
        }
        // if(selects[selects.length - 1].property[propertyName].toString() != selects[selects.length - 1].before[propertyName].toString()) {
        //   newTableElm.find('td:nth-child(1)').css('color', '#88f');
        // }
        
        $('#object_information td')[i*2].innerHTML = propertyName
        $('#object_information td')[i*2+1].innerHTML = value
      }
    }
    $('#object_information').show();
  }
  
  select = selects[selects.length - 1];
  system.delayFunction = [];

  } // 레코딩때는 작동X
  
  // preview times
  preview.times < 0 ? preview.times = 0 : preview.times;
  preview.times > video.maxTimes ? preview.times = video.maxTimes : preview.times;

  $('#video_preview .times').text(performance.times);
  $('#bottom_timeline .gauge').width(preview.times / video.maxTimes*100 + '%')
  $('#current_time_stick').css('left', preview.times / video.maxTimes*100 + '%')

  if(system.showRemainTime) {
    $('#time_interface .end_time').text('-' + tickToTime(video.maxTimes - preview.times));
  } else {
    $('#time_interface .end_time').text(tickToTime(video.maxTimes));
  }
  $('#time_interface .current_time').text(tickToTime(preview.times));

  // export

  if(preview.onStart) {
    if(settings.realTime || system.isRecording) {
      preview.times = new Date().getTime() - system.realTime_startTime + system.recordStartTime;
    } else {
      preview.times += settings.frameRate;
    }

    if(system.isRecording) {
      $('#export_cover progress')[0].value = preview.times - system.recordStartTime;
      $('#export_cover .num').text((preview.times - system.recordStartTime) + '/' + (system.recordEndTime - system.recordStartTime));
      if(preview.times >= system.recordEndTime) {
        $('#export_cover .cancle').text('완료');
        
        system.mediaRecorder.stop();
      }
    }
    if(preview.times >= video.maxTimes) {
      system.start();
    }
  }

}

function tickToTime(tick) {
  var ms = Math.floor(tick % 1000/10);
  var s = Math.floor(tick / 1000) % 60;
  var m = Math.floor(tick / 60000) % 60;
  var h = Math.floor(tick / 3600000) % 24;
  return fillZero(h) + ':' + fillZero(m) + ':' + fillZero(s) + ';' + fillZero(ms);
}

function fillZero(num, length=2, reverse=false) {
  if(reverse) {
    return (num + '0'.repeat(length)).slice(-length);
  } else {
    return ('0'.repeat(length) + num).slice(-length);
  }
}

function createTable() {
  var newTable = document.createElement('table');
  for(let i = 0; i<arguments.length; i++) {
    let newTr = document.createElement('tr');
    for(let j = 0; j<arguments[i].length; j++) {
      let newTd = document.createElement('td');
      newTd.innerText = arguments[i][j];
      newTr.appendChild(newTd);
    }
    newTable.appendChild(newTr);
  }
  return newTable;
}

function deleteArray(arr, a) {
  return arr.includes(a) ? arr.splice(arr.indexOf(a), 1) : false;
}

function newLog() {
  system.logs.splice(system.now_log+1)
  system.now_log += 1;
  system.logs.push({
    video: _.cloneDeep(video),
    selectedObject: system.selectedObject,
  })
  if(system.logs.length > settings.max_logs) {
    system.logs.shift();
  }
  drawing();
  recordCanvas();
}

function gotoLog(num) {
  video = _.cloneDeep(system.logs[num].video);
  system.selectedObject = _.cloneDeep(system.logs[num].selectedObject);
  drawing();
}

var recordCanvas = () => {
  preview.lastImageData = config.canvas.ctx.getImageData(0, 0, config.canvas.width, config.canvas.height);
}

function type(a) {
  return Object.prototype.toString.call(a).slice(8, -1).toLowerCase();
}

function drawing() {
  developer.log('drawing complete.')
  config.canvas.ctx.fillStyle = video.background;
  config.canvas.ctx.fillRect(0, 0, config.canvas.width, config.canvas.height);
  for(let i = 0; i < video.layers.length; i++) {
    for(let j = 0; j < video.layers[i].objects.length; j++) {
      let obj = video.layers[i].objects[j];
      for(let k = 0; k < obj.timeline.length; k++) {
        if(obj.timeline[k].config.animate != 'none') {
          let ani = obj.timeline[k].config.animate;
          // if(preview.times < obj.timeline[k].times && preview.times > ani.duration) {
          //   let nearTimeline = obj.timeline[0];
          //   for(let l = 0; l < obj.timeline.length; l++) {
          //     let otherTimeline = obj.timeline[l];
          //     if(obj.timeline[k].times - nearTimeline.times > obj.timeline[k] - otherTimeline.times) {
          //       nearTimeline = otherTimeline;
          //     }
          //   }
          // }
        } else if(obj.timeline[k].times <= preview.times) {
          for(let l = 0; l < keys(obj.timeline[k].property).length; l++) {
            let propertyName = keys(obj.timeline[k].property)[l]
            obj.property[propertyName] = obj.timeline[k].property[propertyName]
          }
        }
      }
      for(let k = 0; k < keys(obj.func).length; k++) {
        obj.func[keys(obj.func)[k]](obj);
      }
      if(obj.property.visible) {
        config.canvas.ctx.globalAlpha = obj.property.opacity;
        if(obj.type.indexOf('vector') != -1) {
          config.canvas.ctx.fillStyle = obj.property.backgroundColor;
          config.canvas.ctx.strokeStyle = obj.property.backgroundColor;
          if(obj.type.indexOf('rectangle') != -1) {
            config.canvas.ctx.fillRect(obj.property.x+(obj.property.originX * obj.property.width), obj.property.y+(obj.property.originY * obj.property.height), obj.property.width, obj.property.height);
          } else if(obj.type.indexOf('circle') != -1) {
            config.canvas.ctx.beginPath();
            config.canvas.ctx.ellipse(obj.property.x+obj.property.width/2+(obj.property.originX * obj.property.width),
                                      obj.property.y+obj.property.height/2+(obj.property.originY * obj.property.height),
                                      obj.property.width/2, obj.property.height/2, Math.radians(obj.property.rotate), 0, 2*Math.PI);
            config.canvas.ctx.fill();
          } else if(obj.type.includes('line')) {
            config.canvas.ctx.lineWidth = obj.property.lineWidth;
            config.canvas.ctx.beginPath();
            config.canvas.ctx.moveTo(obj.property.x, obj.property.y);
            config.canvas.ctx.lineTo(obj.property.x+obj.property.width, obj.property.y+obj.property.height);
            config.canvas.ctx.stroke();
          }
        } else if(obj.type.indexOf('image') != -1) {
          if(obj.imageData.width != obj.property.width || obj.imageData.height != obj.property.height) {
            obj.updateData()
          }
          config.canvas.ctx.putImageData(obj.imageData, obj.property.x, obj.property.y)
        } else if(obj.type.indexOf('video') != -1) {
          config.canvas.ctx.drawImage(obj.video, obj.property.x, obj.property.y, obj.property.width, obj.property.height);
        }
        obj.before = _.cloneDeep(obj.property);
      }
    }
  }
}

const keys = Object.keys;

// draganddrop
async function dropFunction(event) {
  event.preventDefault(); // 기본 동작을 방지
  trashcan = event.dataTransfer.files[0];
  if(event.dataTransfer.files.length > 0) {
    for(let i = 0; i < event.dataTransfer.files.length; i++) {
      let file = event.dataTransfer.files[i];
      developer.log('recieved file: ' + file.name);
      console.log(file)
      if(file.type.includes('image')) {
        var img = new Image();
        img.src = window.URL.createObjectURL(file);
        img.onload = function() {
          let imgWidth = img.naturalWidth;
          let imgHeight = img.naturalHeight;
          let imgRatio = imgWidth / imgHeight;
          if(imgWidth > config.canvas.width) {
            imgWidth = config.canvas.width;
            imgHeight = imgWidth / imgRatio;
          }
          if(imgHeight > config.canvas.height) {
            imgHeight = config.canvas.height;
            imgWidth = imgHeight * imgRatio;
          }
  
          new Picture(config.canvas.width/2 - imgWidth/2, config.canvas.height/2 - imgHeight/2, imgWidth, imgHeight, img);
          window.URL.revokeObjectURL(img.src);
        }
      } else if(file.name.indexOf('.choux') == file.name.length - 6) {
        video = JSON.parse(await file.text()); // await로 file에서 텍스트 파일을 불러오는 걸 기다린다.
        developer.log('loaded .choux file successfully.')
      } else if(file.type.includes('video')) {
        var video = document.createElement('video');
        trashcan = video;
        video.src = window.URL.createObjectURL(file);
        video.oncanplaythrough = function() {
          let videoWidth = video.videoWidth;
          let videoHeight = video.videoHeight;
          let videoRatio = videoWidth / videoHeight;
          if(videoWidth > config.canvas.width) {
            videoWidth = config.canvas.width;
            videoHeight = videoWidth / videoRatio;
          }
          if(videoHeight > config.canvas.height) {
            videoHeight = config.canvas.height;
            videoWidth = videoHeight * videoRatio;
          }
          
          let obj = new VideoObject(config.canvas.width/2 - videoWidth/2, config.canvas.height/2 - videoHeight/2, videoWidth, videoHeight, video);
          // video.
          window.URL.revokeObjectURL(video.src);
        }
      }
    }
  }
}

function dragOverFunction(event) {
  // console.log('file(s) in drop zone')
  event.preventDefault(); // 기본 동작을 방지
}

function guidelineX(a) {
  system.fakeCtx.strokeStyle = '#0ff';
  system.fakeCtx.lineWidth = 1;
  system.fakeCtx.beginPath();
  const cl = $('#canvas').position().left;
  system.fakeCtx.moveTo(a*preview.zoom+cl-48, 0);
  system.fakeCtx.lineTo(a*preview.zoom+cl-48, $('#fakeCanvas')[0].height);
  system.fakeCtx.stroke();
}

function guidelineY(a) {
  system.fakeCtx.strokeStyle = '#0ff';
  system.fakeCtx.lineWidth = 1;
  system.fakeCtx.beginPath();
  const ct = $('#canvas').position().top;
  system.fakeCtx.moveTo(0, a*preview.zoom+ct);
  system.fakeCtx.lineTo($('#fakeCanvas')[0].width, a*preview.zoom+ct);
  system.fakeCtx.stroke();
}

function saveFile(fileName, content) {
  var blob = new Blob([content], { type: 'text/plain' });
  objURL = window.URL.createObjectURL(blob);

  if(window.__Xr_objURL_forCreatingFile__) {
    window.URL.revokeObjectURL(window.__Xr_objURL_forCreatingFile__);
  }
  window.__Xr_objURL_forCreatingFile__ = objURL;
  var a = document.createElement('a');
  a.download = fileName+'.choux';
  a.href = objURL;
  a.click();
}

function arrayPos(arr=[], fromPos=0, toPos=arr.length) {
  let objElm = arr.splice(fromPos, 1)[0]
  arr.splice(toPos, 0, objElm);
  return objElm;
}

function getR(code) {
  return parseInt(code.substr(1, 2), 16)
}
function getG(code) {
  return parseInt(code.substr(3, 2), 16)
}
function getB(code) {
  return parseInt(code.substr(5, 2), 16)
}

Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
}

function sendData(a) {
  $.ajax({
    url: "/sendData",
    type: "POST",
    data: a,
    dataType: "image/png",
    success: function (res) {
      console.log(res);
    }
  });
}

async function webm2mp4(videoData) {
  let result;
  await $.ajax({
    url: '/convertingMP4',
    type: 'POST',
    data: {
      url: videoData.url, // 서버로 webm의 blob 주소를 전송
      fps: videoData.fps,
    },
    dataType: 'json',
    success: function(res) {
      result = res;
      // 서버로부터 변환된 mp4의 주소를 취득
    }
  })
  return result;
}

function conditional(a, operater, b, AndOr='and') {
  let bool;
  let err;
  if(AndOr == 'or') {
    bool = false;
    if(type(b) != 'array') b = [b];
    if(typeof operater == 'string' || operater.length == 1) {
      if(operater == '=') operater = '==';
      for(let i = 0; i < b.length; i++) {
        switch (operater) {
          case '==' : bool = bool || a == b[i]; break;
          case '===' : bool = bool || a === b[i]; break;
          case '!=' : bool = bool || a != b[i]; break;
          case '>'  : bool = bool || a > b[i]; break;
          case '<'  : bool = bool || a < b[i]; break;
          case '>=' : bool = bool || a >= b[i]; break;
          case '<=' : bool = bool || a <= b[i]; break;
          default : err = 'operaterType';
        }
      }
    } else {
      for(let i = 0; i < b.length; i++) {
        bool = bool || conditional(a, operater[i], b[i]);
      }
    }
  } else if(AndOr == 'and') {
    bool = true;
    if(type(b) != 'array') b = [b];
    if(typeof operater == 'string' || operater.length == 1) {
      if(operater == '=') operater = '==';
      for(let i = 0; i < b.length; i++) {
        switch (operater) {
          case '==' : bool = bool && a == b[i]; break;
          case '===' : bool = bool && a === b[i]; break;
          case '!=' : bool = bool && a != b[i]; break;
          case '>'  : bool = bool && a > b[i]; break;
          case '<'  : bool = bool && a < b[i]; break;
          case '>=' : bool = bool && a >= b[i]; break;
          case '<=' : bool = bool && a <= b[i]; break;
          default : err = 'operaterType';
        }
      }
    } else {
      for(let i = 0; i < b.length; i++) {
        bool = bool && conditional(a, operater[i], b[i]);
      }
    }
  }
  if(err != null) {
    if(err == 'operaterType') console.error("Uncaught TypeError: '"+operater+"' is not a operater.")
  } else {
    return bool
  }
}

let trashcan;

// function Rectangle(width, height) {
//   this.width = width;
//   this.height = height;
// }

class Rectangle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  get S() {
    return this.width*this.height;
  }
}

let rect1 = new Rectangle;

// 1.0.0