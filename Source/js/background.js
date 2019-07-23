chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.recent && request.recent[0] == "[") {
        try {
            recent = JSON.parse(request.recent);
        } catch { }
    } else {
        recent = null;
    }
});

chrome.extension.onConnect.addListener(function (port) {
    let isConnected = true;
    port.onMessage.addListener(function (msg) {
        if (msg.function && msg.args) {
            if (msg.callback) {
                msg.args.push((result) => {
                    if (isConnected) {
                        port.postMessage({ function: msg.callback, args: [result] });
                    }
                });
            }
            this[msg.function].apply(this, msg.args);
        }
    });

    port.onDisconnect.addListener(function () {
        isConnected = false;
    });
});

var settings = null;

function getSettings(callback) {
    callback(settings);
}

function setSettings(newSettings, callback) {
    chrome.permissions.request({
        origins: [ newSettings.protocol + "://" + newSettings.domain + "/" ]
    }, function (result) {
        if (result) {
            chrome.storage.sync.set({
                settings: newSettings
            }, () => {
                settings = newSettings;
                callback(true);
            });
        } else {
            callback(false);
        }
    });
}

chrome.storage.sync.get(["settings"], (result) => {
    settings = result["settings"] || defaultSettings;
});

var recent = null;

function getRecent(callback) {
    callback(recent);
}

var currentUpload = null;
function startUpload(file, callback) {
    currentUpload = {
        error: null,
        json: null,
        finished: false,
        promise: null
    };

    currentUpload.promise = uploadFile(settings.protocol + "://" + settings.domain, file);
    callback(currentUpload);

    currentUpload.promise.then((json) => {
        currentUpload.json = json;
        chrome.tabs.create({ url: json.webUrl });

    }).catch((e) => {
        currentUpload.error = e;
    }).finally(() => {
        currentUpload.finished = true;
        callback(currentUpload);
        currentUpload = null;
    });
}

function isUploading(callback) {
    callback(currentUpload);
}