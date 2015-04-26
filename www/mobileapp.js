"use strict";

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

//keys without password are already hashed to speedup things
function prehashKey(key) {
    return { 
        secret: Crypto.SHA256(keyinfo.secret, { asBytes: true }),
        hasPwd: false
    };
}

function fromOldFormat(domain) {
    //transfer keys from old version
    var keystore = localStorage["secretKey"] ? JSON.parse(localStorage["secretKey"]) : {}
    if (keystore[domain]) {
        var key = keystore[domain];
        if (!key.hasPwd) {
            key = prehashKey(key);
        }
        setKey(domain, key);
        delete keystore[domain];
        localStorage["secretKey"] = JSON.stringify(keystore);
        return key;
    }
}

function getKey(domain) {

    var kstr = localStorage["keyStorage_" + domain];
    if (kstr) {
        return JSON.parse(kstr);
    } else {

        return false;
    }
}

function setKey(domain, keyinfo) {
    localStorage["keyStorage_" + domain] = JSON.stringify(keyinfo);
}


function SignPage() {

    var args = location.hash.substr(1).split(',');
    var lang = args[0];
    var host = args[1];
    var c = args[2];
    var password_input = document.getElementById("password_input");
    var password_form = document.getElementById("password_form");
    var accept_button = document.getElementById("accept_button");
    var create_button= document.getElementById("create_button");
    var always_blank= document.getElementById("always_blank");
    var always_blank_label= document.getElementById("keep_password_blank");
    var spinner = document.getElementById("spinner");

    
    function updateLang() {
        langSetTextId("enter_password");
        langSetTextId("keep_password_blank", "always_blank");
        langSetTextId("accept_button");
        langSetTextId("create_button");
    }

    function showPwd(create) {
        password_form.style.display = "block";
        if (create)
            create_button.style.display = "block";
        else
            accept_button.style.display = "block";
        password_input.focus();
        if (password_input.prompt) password_input.prompt();
        else password_input.click();
  
    }

    function init() {
        loadLang(lang, updateLang);
        var serviceId = document.getElementById("serviceId");
        serviceId.appendChild(document.createTextNode(host));

        var keyinfo = getKey(host);

        if (keyinfo) {

            if (keyinfo.hasPwd) {
                showPwd(false);
            } else {
                setTimeout(signAndPushRequest, 1);
            }
        } else {
            showPwd(true);
        }
        accept_button.addEventListener("click",signAndPushRequest);
        create_button.addEventListener("click",createKey);
        password_input.addEventListener("input", function() {
            var v = password_input.value.length  != 0;
            always_blank.disabled = v;   
            if (v) always_blank.checked = false;
        })
    }

    function signAndPushRequest() {
        password_form.style.display = "none";
        create_button.style.display = "none";
        accept_button.style.display = "none";
        spinner.style.display = "block";
        setTimeout(signAndPushRequest2, 10);
    }

    function saveKeys() {
        localStorage["secretKey"] = JSON.stringify(keystore);
    }

    function combineKeyAndPin(key, pin) {
        var keypin = key + pin;
        return Crypto.SHA256(keypin, { asBytes: true });
    }

    function signRequest(c, key) {
        return sign_message(new Bitcoin.ECKey(key), c, false);
    }


    function signAndPushRequest2() {

        var keyinfo = getKey(host);
        var key;

        if (keyinfo.hasPwd) {
            var removepwd = always_blank.checked;
            if (removepwd) {
                keyinfo.hasPwd = false;
                keyinfo.secret = Crypto.SHA256(keyinfo.secret, { asBytes: true });
                saveKeys();
                key = keyinfo.secret;
            } else {
                var pin = password_input.value;
                key = combineKeyAndPin(keyinfo.secret, pin);
            }
        } else {
            key = keyinfo.secret;
        }


        var timestamp = Math.floor(Date.now() / 1000);
        var msg = "login to " + host + ", challenge is " + c + ", timestamp " + timestamp;
        var signature = signRequest(msg, key);
        //if failed
        if (signature === false) {
            //schedule new try
            setTimeout(signAndPushRequest2, 1);
            return;
        }
        location.href = "r?c=" + c + "&r=" + encodeURIComponent(signature) + "&t=" + timestamp + "#" + lang;

    }
    function createKey() {

        spinner.style.display = "block";
        create_button.style.display = "none";
        setTimeout(createKey2, 10);
    }

    function createKey2() {

        var bytes = secureRandom(32);
        keystore[host] = {
            secret: Crypto.util.bytesToHex(bytes) + c,
            hasPwd: !always_blank.checked
        }
        saveKeys();
        signAndPushRequest();
    }

    init();

}


function startSign() {
    window.signPage = new SignPage;

}

function OKPage() {
    var lang = window.location.hash.substr(1);

    function updateLang() {
        langSetTextId("delivered");
    }

    function init() {
        loadLang(lang, updateLang);
    }

    init();    
   

}

function startOKPage() {

    window.okPage = new OKPage;



}

function FailPage() {
    var lang = window.location.hash.substr(1);

    function updateLang() {
        langSetTextId("failed");
    }

    function init() {
        loadLang(lang, updateLang);
    }

    init();


}

function startFailPage() {

    window.okPage = new FailPage;



}