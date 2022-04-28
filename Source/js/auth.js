"use strict";

function checkAuth(host) {
    return timeoutPromise(3000, new Promise((res, rej) => {
        fetch(host + "/api/2.0/people/@self")
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
    }));
}

function logOut(host) {
    return new Promise((res, rej) => {
        fetch(host + "/api/2.0/authentication/logout", {method: "POST"})
            .then((json) => {
                res(true);
            })
            .catch((err) => {
                rej(err);
            });
    });
}