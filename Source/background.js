chrome.browserAction.onClicked.addListener(function(activeTab){
    chrome.tabs.create({ url: "https://personal.onlyoffice.com?from=google" });
});