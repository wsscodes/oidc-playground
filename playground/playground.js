/****************************/
/* OpenID Connect functions */
/****************************/
// Load the OpenID Provider Configuration
function loadDiscovery() {
    var issuerBase = getInput('input-issuer');
    var realms = getInput('input-realms');
    var issuer = issuerBase+realms;
    setState('issuerBase', issuerBase);
    setState('realms', getInput('input-realms'));

    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            setState('discovery', JSON.parse(req.responseText));
            setOutput('output-discovery', state.discovery);
        }
    }
    req.open('GET', issuer + '/.well-known/openid-configuration', true);
    req.send();
}

// Create an Authentication Request
function generateAuthenticationRequest() {
    var req = state.discovery['authorization_endpoint'];

    var clientId = getInput('input-clientid');
    var scope = getInput('input-scope');
    var prompt = getInput('input-prompt');
    var maxAge = getInput('input-maxage');
    var loginHint = getInput('input-loginhint');

    var authenticationInput = {
        clientId: clientId,
        scope: scope,
        prompt: prompt,
        maxAge: maxAge,
        loginHint: loginHint
    }
    setState('authenticationInput', authenticationInput);

    req += '?client_id=' + clientId;
    req += '&response_type=code';
    req += '&redirect_uri=' + document.location.href.split('?')[0];
    if ('' !== scope) {
        req += '&scope=' + scope;
    }
    if ('' !== prompt) {
        req += '&prompt=' + prompt;
    }
    if ('' !== maxAge) {
        req += '&max_age=' + maxAge;
    }
    if ('' !== loginHint) {
        req += '&login_hint=' + loginHint;
    }

    var reqStr = req.replace('?', '<br/><br/>').replaceAll('&', '<br/>');
    setState('authenticationRequest',reqStr);
    setOutput('output-authenticationRequest', reqStr);

    document.getElementById('authenticationRequestLink').onclick = function() {
        document.location.href = req;
    }
}

// Create a Token Exchange Request
function loadTokens() {
    var code = getInput('input-code');
    var clientId = getInput('input-clientid');

    var params = 'grant_type=authorization_code';
    params += '&code=' + code;
    params += '&client_id=' + clientId;
    params += '&redirect_uri=' + document.location.href.split('?')[0];

    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            var response = JSON.parse(req.responseText);
            setOutput('output-response', req.responseText);

            if (response['id_token']) {
                var idToken = response['id_token'].split('.');
                
                var idTokenHeader = JSON.parse(base64UrlDecode(idToken[0]));
                var idTokenBody = JSON.parse(base64UrlDecode(idToken[1]));
                var idTokenSignature = idToken[2];
                setOutput('output-idtokenHeader', idTokenHeader);
                setOutput('output-idtoken', idTokenBody);
                setOutput('output-idtokenSignature', idTokenSignature);

                // set access token output
                var accessToken = response['access_token'].split('.');
                var accessTokenHeader = JSON.parse(base64UrlDecode(accessToken[0]));
                var accessTokenBody = JSON.parse(base64UrlDecode(accessToken[1]));
                var accessTokenSignature = idToken[2];
                setOutput('output-accesstokenHeader', accessTokenHeader);
                setOutput('output-accesstoken', accessTokenBody);
                setOutput('output-accesstokenSignature', accessTokenSignature);
                setOutput('output-accesstokenRaw', response['access_token']);

                setState('refreshToken', response['refresh_token']);
                setState('idToken', response['id_token']);
                setState('accessToken', response['access_token']);
            } else {
                setOutput('output-idtoken', '');
            }
        }
    }
    req.open('POST', state.discovery['token_endpoint'], true);
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    setOutput('output-tokenRequest', state.discovery['token_endpoint'] + '<br/><br/>' + params.replaceAll('&', '<br/>'));

    req.send(params);

    window.history.pushState({}, document.title, '/');
}

// Create a Refresh Token Request
function refreshTokens() {
    var code = getInput('input-code');
    var clientId = getInput('input-clientid');

    var params = 'grant_type=refresh_token';
    params += '&refresh_token=' + state.refreshToken;
    params += '&client_id=' + clientId;
    params += '&scope=openid';

    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            var response = JSON.parse(req.responseText);
            setOutput('output-refreshResponse', req.responseText);

            if (response['id_token']) {
                var idToken = JSON.parse(base64UrlDecode(response['id_token'].split('.')[1]));
                setOutput('output-idtokenRefreshed', idToken);
                setState('refreshToken', response['refresh_token']);
            } else {
                setOutput('output-idtokenRefreshed', '');
            }

            // set access token output
            if (response['access_token']) {
                var accessToken = JSON.parse(base64UrlDecode(response['access_token'].split('.')[1]));
                setOutput('output-accesstokenRefreshed', accessToken);
                setOutput('output-accesstokenRefreshedRaw', response['access_token']);
            } else {
                setOutput('output-accesstokenRefreshed', '');
            }
        }
    }
    req.open('POST', state.discovery['token_endpoint'], true);
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    setOutput('output-refreshRequest', state.discovery['token_endpoint'] + '<br/><br/>' + params.replaceAll('&', '<br/>'));

    req.send(params);

    window.history.pushState({}, document.title, '/');
}

function showLogOutUrl(){
    var logOutUrl = state.discovery['end_session_endpoint'];
    var logOutIdToken = getState("idToken");
    var redirectUri = window.location.origin + "";
    logOutUrl = logOutUrl
    + '?post_logout_redirect_uri=' + encodeURIComponent(redirectUri)
    + '&id_token_hint=' + encodeURIComponent(logOutIdToken);

    setOutput("output-logoutUrl",logOutUrl);
}

function doLogOut(){
    var logOutUrl = state.discovery['end_session_endpoint'];
    setOutput("output-logoutUrl",logOutUrl);
    var logOutIdToken = getState("idToken");
   
    logOutUrl = logOutUrl
    + '?post_logout_redirect_uri=' + encodeURIComponent("http://localhost:8000/")
    + '&id_token_hint=' + encodeURIComponent(logOutIdToken);

    setOutput("output-dologout",logOutUrl);
    window.location.replace(logOutUrl);
}

// Create a UserInfo Request
function userInfo() {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            var response = JSON.parse(req.responseText);
            setOutput('output-userInfoResponse', req.responseText);
        }
    }
    req.open('GET', state.discovery['userinfo_endpoint'], true);
    req.setRequestHeader('Authorization', 'Bearer ' + state.accessToken);

    setOutput('output-userInfoRequest', state.discovery['userinfo_endpoint'] + '<br/><br/>' + 'Authorization: Bearer ' + state.accessToken);

    req.send();

    window.history.pushState({}, document.title, '/');
}
