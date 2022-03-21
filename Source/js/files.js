"use strict";

function createFile(host, title) {
    return new Promise((res, rej) => {
        fetch(host + "/api/2.0/files/@my/file", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title
            })
        })
            .then((response) => {
                if (!response.ok) rej(response.statusText);
                return response.json();
            })
            .then((json) => {
                res(json.response);
            })
            .catch((err) => {
                rej(err);
            });
    });
}

function uploadFile(host, fileInfo) {
    let array = [];
    for (let bit in fileInfo.file) array.push(fileInfo.file[bit]);
    let formData = new FormData();

    let buffer = new Uint8Array(array);
    let blob = new Blob([buffer], {type: fileInfo.fileType});
    formData.append("file", blob, fileInfo.fileName);

    return new Promise((res, rej) => {
        fetch(host + "/api/2.0/files/@my/upload", {
            method: "post",
            body: formData
        })
            .then((response) => {
                if (!response.ok) rej(response.statusText);
                return response.json();
            })
            .then((json) => {
                res(json.response);
            })
            .catch((err) => {
                rej(err);
            });
    });
}

function getRecentFiles(host) {
    return new Promise((res, rej) => {
        fetch(host + `/api/2.0/files/@recent?filterType=FilesOnly`, {
            method: "get"
        })
            .then((response) => {
                if (!response.ok) rej(response.statusText);
                return response.json();
            })
            .then((json) => {
                res(json.response);
            })
            .catch((err) => {
                rej(err);
            });
    })
}
