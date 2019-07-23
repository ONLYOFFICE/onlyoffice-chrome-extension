"use strict";

function checkAuth(host) {
    return new Promise((res, rej) => {
        fetch(host + "/api/2.0/people/@self")
        .then((response) => {
            if (!response.ok) rej(response.statusText);
            return response.json();
        })
        .then((json) => {
            res(json.response);
        })
        .catch(function(err) {
            rej(err);
        });
    });
}

function logOut(host) {
    return new Promise((res, rej) => {
        fetch(host + "/auth.aspx?t=logout")
            .then((json) => {
                res(true);
            })
            .catch(function (err) {
                rej(err);
            });
    });
}