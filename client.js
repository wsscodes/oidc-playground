
/*************************/
/* Application functions */
/*************************/

var steps = ['discovery', 'authentication', 'token', 'refresh', 'userinfo','logout'];
var state = loadState();

function reset() {
    localStorage.removeItem('state');
    window.location.reload();
}

function loadState() {
   var s = localStorage.getItem('state');
   if (s) {
       return JSON.parse(s);
   } else {
       return {
           step: 'discovery'
       }
   }
}

function setState(key, value) {
    state[key] = value;
    localStorage.setItem('state', JSON.stringify(state));
}

function getState(key) {

     //var map = JSON.parse(localStorage.getItem('state'));
     //console.log("idToken :",map['idToken']);
     return loadState()[key];
}

function step(step) {
    setState('step', step);
    for (i = 0; i < steps.length; i++) {
        document.getElementById('step-' + steps[i]).style.display = steps[i] === step ? 'block' : 'none'
    }
    setState('step', step);

    switch(step) {
        case 'discovery':
            if (state.issuer) {
                setInput('input-issuer', state.issuer);
            }
            break;
        case 'authentication':
            var authenticationInput = state.authenticationInput;
            if (authenticationInput) {
                setInput('input-clientid', authenticationInput.clientId);
                setInput('input-scope', authenticationInput.scope);
                setInput('input-prompt', authenticationInput.prompt);
                setInput('input-maxage', authenticationInput.maxAge);
                setInput('input-loginhint', authenticationInput.loginHint);
                setOutput('output-authenticationResponse', '');
            }
            break;
    }
}


function getInput(id) {
    return document.getElementById(id).value
}

function setInput(id, value) {
    return document.getElementById(id).value = value
}

function setOutput(id, value) {
    // 先缓存
    var key = "";
    if(id.indexOf("-")>0){
        key = id.split("-")[1];
    }
    setState(key, value);

    // 页面输出
    if (typeof value === 'object') {
        value = JSON.stringify(value, null, 2)
    } else if (value.startsWith('{')) {
        value = JSON.stringify(JSON.parse(value), null, 2)
    }
    
    if(document.getElementById(id).tagName == 'INPUT'){//如果是INPUT,判断是何种INPUT,checkbox、text等
        document.getElementById(id).value = value;
    }else{
        document.getElementById(id).innerHTML = value;
    }
   
}

function getQueryVariable(key) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == key) {
            return decodeURIComponent(pair[1]);
        }
    }
}

function base64UrlDecode(input) {
    input = input
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    var pad = input.length % 4;
    if(pad) {
      if(pad === 1) {
        throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
      }
      input += new Array(5-pad).join('=');
    }

    return atob(input);
}

function init() {
    step(state.step);
    if (state.discovery) {
        setOutput('output-discovery', state.discovery);
        setOutput('input-issuer', state.issuerBase);
        setOutput('input-realms', state.realms);
        setOutput('output-authenticationRequest', state.authenticationRequest);
    }

    var code = getQueryVariable('code');
    if (code) {
        setInput('input-code', code);
        setOutput('output-authenticationResponse', 'code=' + code);
    }

    var error = getQueryVariable('error');
    var errorDescription = getQueryVariable('error_description');
    if (error) {
        setOutput('output-authenticationResponse', 'error=' + error + '<br/>error_description=' + errorDescription);
    }
}

// copcy text to clipboard
function copyText(id) {
  var copyText = document.getElementById(id);
  navigator.clipboard.writeText(copyText.innerHTML);
}

// 动态加载html页面（div-id，path）
function loadDocument(divId,documentPath) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {

        if (req.readyState === 4) {
            document.getElementById(divId).append(req.responseText);
            setOutput(divId,req.responseText);
        }
    }

    req.open('get', documentPath, true);
    req.send();

    window.history.pushState({}, document.title, '/');
}


