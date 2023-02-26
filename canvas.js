class VectorObject {
  constructor(x, y, width, height, type) {
    var body = this;
    switch (type) {
      case "rect" : type = 'rectangle'; break;
      case "rectangle" : type = 'rectangle'; break;
      case 'circle' : type = 'circle'; break;
      case 'line' : type = 'line'; break;
      case 'cir' : type = 'circle'; break;
      case 'l' : type = 'line'; break;
      case 'ellipse' : type = 'circle'; break;
      default : type = 'rectangle'; break;
    }
    this.type = ['vector', type];
    width == null ? width = 100 : width = Math.round(width);
    height == null ? height = 100 : height = Math.round(height);
    x == null ? x = (config.canvas.width - width)/2 : x = Math.round(x);
    y == null ? y = (config.canvas.height - height)/2 : y = Math.round(y);
    if(type != 'line') {
      if(width < 0) {x += width; width = -width;}
      if(height < 0) {y += height; height = -height;}
    }
    this.clientX = 0;
    this.clientY = 0;
    this.events = [];
    this.onMouse = false;
    this.isSelected = false;
    this.transform = {};
    this.isTransformed = false;
    this.layer = system.current_layer;
    this.fixed_ratio = false;
    this.property = {
      x: x,
      y: y,
      width: width,
      height: height,
      backgroundColor: settings.randomColor ? '#'+fillZero(Math.round(Math.random()*0xffffff).toString(16), 6) : system.mainColor,
      rotate: 0,
      visible: true,
      opacity: 1,
      originX: 0,
      originY: 0,
      ratio: width/height,
    }
    if(type == 'line') {
      this.property.lineWidth = settings.basicLineWidth;
    }
    this.timeline = [];
    this.before = _.cloneDeep(this.property);
    this.func = {};
    for(let i = 0; i < Object.keys(this.property).length; i++) {
      this.transform[Object.keys(this.property)[i]] = 0;
    }
    
    video.layers[system.current_layer].objects.push(this);
    this.addTimeline(_.cloneDeep(this.property), 0); // drawing 실행 때문에 마지막에 넣어야함

    return this;
  }

  addTimeline(property, times, config) {
    addTimeline(this, property, times, config);
  }

  addFunc(func, key) {
    return addFunc(this, func, key);
  }
}

class TextObject {
  constructor(x, y, px, text) {
    var body = this;
    this.type = ['text'];
    x == null ? x = (config.canvas.width - width)/2 : x = Math.round(x);
    y == null ? y = (config.canvas.height - height)/2 : y = Math.round(y);
    if(type != 'line') {
      if(width < 0) {x += width; width = -width;}
      if(height < 0) {y += height; height = -height;}
    }
    this.clientX = 0;
    this.clientY = 0;
    this.events = [];
    this.onMouse = false;
    this.isSelected = false;
    this.transform = {};
    this.isTransformed = false;
    this.layer = system.current_layer;
    this.property = {
      x: x,
      y: y,
      px: px,
      text: text,
      fontFamily: consolas,
      backgroundColor: settings.randomColor ? '#'+fillZero(Math.round(Math.random()*0xffffff).toString(16), 6) : system.mainColor,
      rotate: 0,
      visible: true,
      opacity: 1,
      originX: 0,
      originY: 0,
    }
    if(type == 'line') {
      this.property.lineWidth = settings.basicLineWidth;
    }
    this.timeline = [];
    this.before = _.cloneDeep(this.property);
    this.func = {};
    for(let i = 0; i < Object.keys(this.property).length; i++) {
      this.transform[Object.keys(this.property)[i]] = 0;
    }
    
    video.layers[system.current_layer].objects.push(this);
    this.addTimeline(_.cloneDeep(this.property), 0); // drawing 실행 때문에 마지막에 넣어야함

    return this;
  }

  addTimeline(property, times, config) {
    addTimeline(this, property, times, config);
  }

  addFunc(func, key) {
    return addFunc(this, func, key);
  }
}

class Picture {
  constructor(x, y, width, height, img) {
    var body = this;
    this.type = ['image'];
    width == null ? width = 100 : width = Math.round(width);
    height == null ? height = 100 : height = Math.round(height);
    x == null ? x = (config.canvas.width - width)/2 : x = Math.round(x);
    y == null ? y = (config.canvas.height - height)/2 : y = Math.round(y);
    if(width < 0) {x += width; width = -width;}
    if(height < 0) {y += height; height = -height;}
    this.clientX = 0;
    this.clientY = 0;
    this.events = [];
    this.onMouse = false;
    this.isSelected = false;
    this.img = img;
    this.imageData = null;
    this.fixed_ratio = true;
    this.property = {
      x: x,
      y: y,
      width: width,
      height: height,
      rotate: 0,
      visible: true,
      opacity: 1,
      originX: 0,
      originY: 0,
      ratio: width/height,
    }
    this.updateData();
    this.timeline = [];
    this.before = _.cloneDeep(this.property);
    this.transform = {};
    this.func = {};
    this.isTransformed = false;
    for(let i = 0; i < Object.keys(this.property).length; i++) {
      this.transform[Object.keys(this.property)[i]] = 0;
    }
    
    video.layers[system.current_layer].objects.push(this);
    this.addTimeline(_.cloneDeep(this.property), 0);

    return this;
  }

  updateData() {
    let dummyCanvas = $('<canvas>');
    dummyCanvas[0].width = this.property.width;
    dummyCanvas[0].height = this.property.height;
    let dummyCtx = dummyCanvas[0].getContext('2d');
    dummyCtx.drawImage(this.img, 0, 0, this.property.width, this.property.height);
    this.imageData = dummyCtx.getImageData(0, 0, this.property.width, this.property.height);
    dummyCanvas.remove();
    developer.log('load image successively');
    drawing();
  }

  addTimeline(property, times, config) {
    addTimeline(this, property, times, config);
  }

  addFunc(func, key) {
    return addFunc(this, func, key);
  }
}

class VideoObject {
  constructor(x, y, width, height, videoElement) {
    var body = this;
    this.type = ['video'];
    width == null ? width = 100 : width = Math.round(width);
    height == null ? height = 100 : height = Math.round(height);
    x == null ? x = (config.canvas.width - width)/2 : x = Math.round(x);
    y == null ? y = (config.canvas.height - height)/2 : y = Math.round(y);
    if(width < 0) {x += width; width = -width;}
    if(height < 0) {y += height; height = -height;}
    this.clientX = 0;
    this.clientY = 0;
    this.events = [];
    this.onMouse = false;
    this.isSelected = false;
    this.currentTime = 0;
    this.maxTime = videoElement.duration,
    this.video = videoElement,
    this.property = {
      x: x,
      y: y,
      width: width,
      height: height,
      rotate: 0,
      visible: true,
      opacity: 1,
      center: [0.5, 0.5],
    }
    this.timeline = [];
    this.before = _.cloneDeep(this.property);
    this.transform = {};
    this.func = {};
    this.isTransformed = false;
    for(let i = 0; i < Object.keys(this.property).length; i++) {
      this.transform[Object.keys(this.property)[i]] = 0;
    }
    
    video.layers[system.current_layer].objects.push(this);
    this.addTimeline(_.cloneDeep(this.property), 0);

    return this;
  }

  addTimeline(property, times, config) {
    addTimeline(this, property, times, config);
  }

  addFunc(func, key) {
    return addFunc(this, func, key);
  }
}

// VectorObject BitmapObject

class Layer {
  constructor(name, zindex, config) {
    if(name == null) {
      name = 'layer_'+video.layers.length;
    }
    if(zindex == null) {
      zindex = current_layer+1;
    }
    video.layers
  }
}

function addTimeline(obj, property, times, config={}, update=true) {
  let addTimelineFunction = function (obj, property, times, config={}) {
    for(let i = 0; i < obj.timeline.length; i++) {
      if(times == obj.timeline[i].times && _.isEqual(config, obj.timeline[i].config)) {
        for(let j = 0; j < keys(property).length; j++) {
          obj.timeline[i].property[keys(property)[j]] = property[keys(property)[j]];
        }
        developer.log('this timeline merge with the timeline that already exist.');
        return obj.timeline[i];
      }
    }
    var newTimeline = {
      times: times,
      property: _.cloneDeep(property),
      config: config,
    }
    obj.timeline.push(newTimeline)
    return newTimeline;
  }

  if(times == null) times = preview.times;
  if(config == null || _.isEmpty(config)) {config = {
    animate: 'none',
    duration: 0,
    // func: {key: function (self)},
  }};
  if(config.hasOwnProperty('animate') == false) {config.animate = 'none';}
  let newTimeline;
  if(type(obj) == 'array') {
    for(var i = 0; i < obj.length; i++) {
      newTimeline = addTimelineFunction(obj[i], property, times, config);
    }
  } else {
    newTimeline = addTimelineFunction(obj, property, times, config);
  }
  if(update) {
    newLog();
  }
  return newTimeline;
}

function addFunc(obj, func, key, update=true) {
  let addFuncFunction = function (obj, func, key) {
    if(key == null) {
      key = 'func'+keys(obj.func).length;
    }
    obj.func[key] = func;
  }
  if(type(obj) == 'array') {
    for(var i = 0; i < obj.length; i++) {
      addFuncFunction(obj[i], func, key);
    }
  } else {
    addFuncFunction(obj, func, key);
  }
  if(update) {
    newLog();
  }
  return func;
}

function timeline(property) {
  return addTimeline(selects, property)
}

const canvas = {
  timeline: timeline,
  addTimeline: addTimeline,
}

async function loadFonts(id, src) {
  const font = new FontFace(id, 'url('+src+')');
  await font.load();
  document.fonts.add(font);
}