var _AudioContext = window.AudioContext ||
                    window.webkitAudioContext;
var webAudioContext = _AudioContext ? new _AudioContext()
                                    : null;

var stock = {};

function addStock(n,              // @arg Integer - index
                  nodeType,       // @arg String - "audio", "webaudio"
                  url,            // @arg URLString
                  responseType) { // @arg String - "arraybuffer", "blob"
    stock[n] = {
        node:       null,           // <audio>
        nodeType:   nodeType,       // "audio", "webaudio"
        url:        url,
        responseType: responseType, // "blob", "arraybuffer"
        mime:       "",
        size:       0,
        data:       null,
        sound: {
            canplay: false,
            buffer: null,
            source: null
        }
    };
}

var cache = new WMCache({}, function() {}, function(err) {
                console.log(err.message);
            });

function getCachedAudio(n) {
    var target = stock[n];
    var url = target.url;

    cache.get(url, function(url, data, mime, size) {
        target.data = data; // blob or arraybuffer
        target.mime = mime;
        target.size = size;
        _downloaded(n);
    });
}

function loadAudio(n) {
    var target = stock[n];

    if (target.responseType) {
        _download(target.url, target.responseType, function(data, mime, size) {
            target.data = data; // blob or arraybuffer
            target.mime = mime;
            target.size = size;
            _downloaded(n);
        });
    } else {
        _downloaded(n);
    }
}

function _download(url, responseType, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        callback(xhr.response,
                 xhr.getResponseHeader("content-type"),
                 parseInt(xhr.getResponseHeader("content-length")) || 0);
    };
    xhr.responseType = responseType;
    xhr.open("GET", url);
    xhr.send();
}

function _downloaded(n) {
    var target = stock[n];
    var data = target.data;

    if (target.nodeType === "audio") {
        var bloburl = "";
        if (data instanceof ArrayBuffer) {
            bloburl = URL.createObjectURL( new Blob([data], { type: target.mime /* "audio/mp4" */ }) );
        } else if (data instanceof Blob) {
            bloburl = URL.createObjectURL(data);
        } else {
            bloburl = target.url;
        }
        target.node = new Audio();
        target.node.src = bloburl;
        target.node.volume = 0.2;
        target.node.addEventListener("progress", handleEvent, false);
        target.node.addEventListener("canplay", handleEvent, false);
        target.node.load();
    } else {
        if (data instanceof ArrayBuffer) {
            webAudioContext.decodeAudioData(data, function(decodedBuffer) {
                target.sound.buffer = decodedBuffer;
                _ready();
            });
        } else if (data instanceof Blob) {
            var reader = new FileReader();
            reader.onloadend = function() {
                webAudioContext.decodeAudioData(reader.result, function(decodedBuffer) {
                    target.sound.buffer = decodedBuffer;
                    _ready();
                });
            };
            reader.readAsArrayBuffer(data);
        }
    }

    function handleEvent(event) {
        var duration = target.node.duration;

        switch (event.type) {
        case "canplay":
            target.node.removeEventListener("canplay", handleEvent, false);
            target.sound.canplay = true;
            break;
        case "progress":
            break;
        }
        if (duration > 0 && target.sound.canplay) {
            target.node.removeEventListener("progress", handleEvent, false);
            _ready();
        }
    }
}

function playAudio(n) {
    var target = stock[n];

    if (target.nodeType === "audio") {
        target.node.play();
    } else if (target.nodeType === "webaudio") {
        stopAudio(n);
        target.sound.source = webAudioContext.createBufferSource();
        target.sound.source.buffer = target.sound.buffer;
        target.sound.source.connect(webAudioContext.destination);
        if (target.sound.source.start) {
            target.sound.source.start(0);
        } else {
            target.sound.source.noteOn(0); // [iOS 6.x]
        }
    }
}

function stopAudio(n) {
    var target = stock[n];

    if (target.nodeType === "audio") {
        if (target.node) {
            target.node.pause();
        }
    } else if (target.nodeType === "webaudio") {
        if (target.sound.source) {
            if (target.sound.source.stop) {
                target.sound.source.stop(0);
            } else {
                target.sound.source.noteOff(0); // [iOS 6.x]
            }
            target.sound.source = null;
        }
    }
}

var read = 0, green = 80, blue = 0;
function _ready() {
    green += 32;
    if (green >= 256) {
        blue += 32;
        green = 80;
    }
    document.body.style.cssText = "background-color: rgb(0, " + green + ", " + blue + ")";
}

