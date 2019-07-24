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

function uploadFile(host, file) {
    var formData = new FormData();
    formData.append("file", file, file.name);

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