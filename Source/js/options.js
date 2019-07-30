window.onload = function () {
    let domain = document.getElementById("domain");
    let protocol = document.getElementById("protocol");
    let saveBtn = document.getElementById("save");
    let status = document.getElementById("status");

    let background = chrome.extension.connect();
    background.onMessage.addListener(function (msg) {
        if (msg.function) {
            callbacks[msg.function].apply(this, msg.args);
        }
    });

    let callbacks = {
        onGetSettings: onGetSettings,
        onSetSettings: onSetSettings
    };

    let settings = null;

    function onGetSettings(response) {
        settings = response;

        protocol.value = settings.protocol;
        domain.value = settings.domain;

        saveBtn.onclick = () => {
            let newSettings = {
                protocol: protocol.value.trim(),
                domain: domain.value.trim()
            }

            if (!newSettings.protocol || !newSettings.domain) return;
            if (newSettings.protocol == settings.protocol
                && newSettings.domain == settings.domain) return;

            background.postMessage({
                function: "setSettings",
                callback: "onSetSettings",
                args: [newSettings]
            });
        }
    }

    function onSetSettings(result) {
        if (result) {
            status.innerText = chrome.i18n.getMessage("savedSettings");
        } else {
            status.innerText = chrome.i18n.getMessage("failedSaveSettings");
        }
    }

    GetTranslations();

    background.postMessage({
        function: "getSettings",
        callback: "onGetSettings",
        args: []
    });
};