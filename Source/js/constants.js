var defaultSettings = {
    domain: "personal.onlyoffice.com",
    protocol: "https"
};

var recentFilesMax = 3;
var displayNoneClass = "display-none";

var maxUploadableLength = 5 * 1024 * 1024;
var uploadableFiles = {
    "txt": "text/plain",
    "csv": "text/csv",
    "pdf": "application/pdf",

    "doc": "application/msword",
    "docx": "application/vndopenxmlformats-officedocumentwordprocessingmldocument",
    "odt": "application/vnd.oasis.opendocument.text ",

    "xls": "application/vndms-excel",
    "xlsx": "application/vndopenxmlformats-officedocumentspreadsheetmlsheet",
    "ods": "application/vnd.oasis.opendocument.spreadsheet",

    "ppt": "application/vndms-powerpoint",
    "pptx": "application/vndopenxmlformats-officedocumentpresentationmlpresentation",
    "odp": "application/vnd.oasis.opendocument.presentation"
};

var documentExts = ["doc", "docx", "docm", "dot", "dotx", "dotm", "odt", "fodt", "ott", "rtf", "txt", "html", "htm", "mht", "xml", "pdf", "djvu", "fb2", "epub", "xps", "oxps"];
var slideExts = ["pps", "ppsx", "ppsm", "ppt", "pptx", "pptm", "pot", "potx", "potm", "odp", "fodp", "otp"];
var cellExts = ["xls", "xlsx", "xlsm", "xlt", "xltx", "xltm", "ods", "fods", "ots", "csv"];

function timeoutPromise(ms, promise) {
    return new Promise((res, rej) => {
        setTimeout(() => {
            rej(new Error("timeout"));
        }, ms);

        promise.then(res, rej);
    })
}