(function () {
    var recent = localStorage.getItem("TeamLabRecentDocuments");
    chrome.runtime.sendMessage({ recent: recent });
})();