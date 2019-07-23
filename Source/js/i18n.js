function GetTranslations() {
    let elements = document.querySelectorAll("div,span");

    for (let i = 0; i < elements.length; i++) {
        let el = elements[i];
        let key = el.getAttribute("data-i18n");

        if (!key) continue;

        el.innerText = chrome.i18n.getMessage(key);
    }
};