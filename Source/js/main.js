"use strict";

window.onload = function () {
    let loginSection = document.getElementById("login");
    let contentSection = document.getElementById("content");
    let errorSection = document.getElementById("errorSection");

    let loader = document.getElementById("loader");
    let avatarHolder = document.getElementById("avatarHolder");
    let userInfoHolder = document.getElementById("userInfoHolder");
    let switcher = document.getElementById("switcher");
    let popup = document.getElementById("popup");
    let overlay = document.getElementById("overlay");
    let error = document.getElementById("error");
    let errorText = document.getElementById("errorText");
    let logOutBtn = document.getElementById("logOutBtn");
    let errorSectionText = document.getElementById("errorSectionText");

    let recentFilesList = document.getElementById("recentFilesList");
    let recentFilesMenu = recentFilesList.getElementsByClassName("menu")[0];
    let iframe = document.getElementById("iframe");

    let uploadCont = document.getElementById("uploadCont");
    let uploadBtn = document.getElementById("uploadBtn");
    let uploadInput = document.getElementById("uploadInput");
    let uploadProgress = document.getElementById("uploadProgress");

    let currentUser;
    let recentFiles;

    let personalAddress;

    let callbacks = {
        onGetRecent: onGetRecent,
        uploadingProgress: uploadingProgress,
        onGetSettings: onGetSettings
    };

    let background = chrome.runtime.connect();
    background.onMessage.addListener(function (msg) {
        if (msg.function) {
            callbacks[msg.function].apply(this, msg.args);
        }
    });

    chrome.runtime.getPlatformInfo((p) => {
        if (p.os == chrome.runtime.PlatformOs.LINUX) {
            uploadCont.classList.add(displayNoneClass);
        }
    });

    function fillHtml() {
        background.postMessage({
            function: "isUploading",
            callback: "uploadingProgress",
            args: []
        });

        let avatarUrl = currentUser.avatarMedium.includes("/skins/default/") ? null :
            (currentUser.avatarMedium.startsWith("/") ? personalAddress + currentUser.avatarMedium : currentUser.avatarMedium);

        let avatarImg = avatarHolder.children[0];
        let avatarFallback = avatarHolder.children[1];

        if (avatarUrl) {
            avatarImg.setAttribute("src", avatarUrl);
            avatarFallback.classList.add(displayNoneClass);
            avatarImg.classList.remove(displayNoneClass);
        } else {
            avatarImg.classList.add(displayNoneClass);
            avatarFallback.classList.remove(displayNoneClass);
            avatarFallback.innerText = currentUser.displayName[0].toUpperCase();
        }

        userInfoHolder.children[0].innerText = currentUser.displayName;
        userInfoHolder.children[1].children[0].innerText = currentUser.email;
    }

    function fixLinks() {
        let links = document.getElementsByTagName("a");
        for (let i = 0; i < links.length; i++) {
            let curLink = links[i].getAttribute("href");
            if (!curLink || !curLink.startsWith("/")) continue;

            links[i].setAttribute("href", personalAddress + curLink);
        }
    }

    function handleFile(file) {
        background.postMessage({
            function: "startUpload",
            callback: "uploadingProgress",
            args: [file]
        });
    }

    function uploadingProgress(obj) {
        if (!obj) return;

        if (obj.error) {
            ShowError(chrome.i18n.getMessage("errorUploadFile"));
        }

        if (obj.finished) {
            uploadProgress.classList.add(displayNoneClass);
            uploadBtn.classList.remove(displayNoneClass);
        } else {
            uploadBtn.classList.add(displayNoneClass);
            uploadProgress.classList.remove(displayNoneClass);
        }
    }

    var errorTimeout;
    function ShowError(message) {
        HideError(true);
        errorText.innerText = message;
        error.classList.remove(displayNoneClass);
        error.classList.add("in");
        errorTimeout = setTimeout(HideError, 3000);
    }

    function HideError(instant) {
        if (errorTimeout) clearTimeout(errorTimeout);
        errorTimeout = null;
        error.classList.remove("in");
        if (instant) {
            error.classList.remove("out");
            error.classList.add(displayNoneClass)
        } else {
            error.classList.add("out");
            errorTimeout = setTimeout(() => { HideError(true); }, 280);
        }
    }

    function bindActions() {
        logOutBtn.onclick = () => {
            logOut(personalAddress).then(() => {
                currentUser = null;
                switchView();
            }).catch(() => { });
        };

        let switcherFunc = () => {
            let triangle = switcher.children[1];

            triangle.classList.toggle("down");
            triangle.classList.toggle("up");

            overlay.classList.toggle(displayNoneClass);
            popup.classList.toggle(displayNoneClass);
        };

        switcher.onclick = switcherFunc;
        overlay.onclick = switcherFunc;

        uploadInput.onchange = async (e) => {
            if (e.target.files.length != 1) {
                ShowError(chrome.i18n.getMessage("errorFilesCount"));
                e.target.value = "";
                return;
            }

            let file = e.target.files[0];

            if (file.size > maxUploadableLength) {
                ShowError(chrome.i18n.getMessage("errorBigFile"));
                e.target.value = "";
                return;
            }

            let ext = getExt(file.name);

            if (!uploadableFiles[ext]) {
                ShowError(chrome.i18n.getMessage("errorWrongExtensions"));
                e.target.value = "";
                return;
            }

            let buffer = await file.arrayBuffer();
            let uintArray = new Uint8Array(buffer);
            let obj = {
                fileType: file.type,
                fileName: file.name,
                file: uintArray

            };
            handleFile(obj);
            if (e.target !== null) e.target.value = "";

            uploadBtn.classList.add(displayNoneClass);
            uploadProgress.classList.remove(displayNoneClass);
        };

        uploadBtn.onclick = () => {
            uploadInput.click();
        };

        let create = (ext) => {
            return (e) => {
                let fname = e.target.innerText + ext;
                createFile(personalAddress, fname).then((file) => {
                    chrome.tabs.create({ url: file.webUrl });
                }).catch(() => {
                    ShowError(chrome.i18n.getMessage("errorCreateNew"));
                });
            }
        };

        document.getElementById("crdocx").onclick = create(".docx");
        document.getElementById("crxlsx").onclick = create(".xlsx");
        document.getElementById("crpptx").onclick = create(".pptx");
    }

    function getExt(filename) {
        if (!filename) return "";
        let posExt = filename.lastIndexOf(".");
        return 0 <= posExt ? filename.substring(posExt + 1).trim().toLowerCase() : "";
    }

    function getIconByExt(ext) {
        if (documentExts.includes(ext)) {
            return "text";
        }
        else if (cellExts.includes(ext)) {
            return "spreadsheet";
        }
        else if (slideExts.includes(ext)) {
            return "presentation";
        }
    }

    function onGetRecent(result) {
        recentFiles = result || [];

        if (recentFiles.length) {
            // <a><span class="ext-img xlsx"></span>1234.xlsx</a>
            var count = recentFiles.length > recentFilesMax ? recentFilesMax : recentFiles.length;

            for (let i = 0; i < count; i++) {
                let file = recentFiles[recentFiles.length - 1 - i];
                if (!file.title || !file.webUrl) continue;

                let a = document.createElement("a");
                a.innerText = file.title;
                let ext = getExt(file.title);
                if (ext) {
                    let span = document.createElement("span");
                    span.className = "ext-img " + getIconByExt(ext);
                    a.prepend(span);
                }

                a.onclick = () => {
                    chrome.tabs.create({ url: file.webUrl });
                }

                recentFilesMenu.append(a);
            }

            recentFilesList.classList.remove(displayNoneClass);
        }
    }

    function getRecent() {
        iframe.setAttribute("src", personalAddress + "/favicon.ico");
        iframe.onload = () => {
            background.postMessage({
                function: "getRecent",
                callback: "onGetRecent",
                args: []
            });
        };
    }

    function switchView(error) {
        loader.classList.add(displayNoneClass);

        if (error) {
            loginSection.classList.add(displayNoneClass);
            contentSection.classList.add(displayNoneClass);
            errorSection.classList.remove(displayNoneClass);
            errorSectionText.innerText = chrome.i18n.getMessage("errorServerUnavailable");
        } else if (currentUser) {
            errorSection.classList.add(displayNoneClass);
            loginSection.classList.add(displayNoneClass);
            contentSection.classList.remove(displayNoneClass);
        } else {
            errorSection.classList.add(displayNoneClass);
            contentSection.classList.add(displayNoneClass);
            loginSection.classList.remove(displayNoneClass);
        }
    }

    GetTranslations();

    background.postMessage({
        function: "getSettings",
        callback: "onGetSettings",
        args: []
    });

    function onGetSettings(settings) {
        personalAddress = settings.protocol + "://" + settings.domain;

        checkAuth(personalAddress)
            .then((user) => {
                currentUser = user;

                switchView();
                fillHtml();

            }).catch((e) => {
                currentUser = null;
                if (e.message == "timeout") {
                    switchView("errorServerUnavailable");
                } else {
                    switchView();
                }
            });

        fixLinks();
        bindActions();
        getRecent();
    }
};