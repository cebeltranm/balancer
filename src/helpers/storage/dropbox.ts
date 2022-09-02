import { Dropbox, DropboxAuth, DropboxResponseError } from 'dropbox';

const CLIENT_ID = 'odmed9kdyvxuszo';
const REDIRECT_URI = `${window.location.protocol}//${window.location.host}${window.location.pathname.includes('balancer') ? '/balancer/' : '/'}`;
const TOKEN_ID = 'dbx_token';
const REFRESH_TOKEN_ID = 'dbx__refresh_token';
const CODE_VERIFIER_ID = '__codeVerifier';


export default class DropboxStore {

    __getDropbox() {
        var dbxAuth = new DropboxAuth({
            clientId: CLIENT_ID,
            accessToken: window.localStorage.getItem(TOKEN_ID),
        });

        return new Dropbox({ auth: dbxAuth });    
    }

    async getInfo() {
        const info = {
            type: 'Dropbox',
            loggedIn: false,
            offline: true,
            user: {}
        };

        try {
            if (window.localStorage.getItem(TOKEN_ID)) {
                info.loggedIn = true;
                const dbx = this.__getDropbox();
                try {
                    const res = await dbx.checkUser({});
                    if (res.status === 200) {
                        info.offline = false;
                    }
                } catch(e) {
                    if ( !(e instanceof DropboxResponseError) || e.status !== 401) {
                        info.offline = true;
                    }
                }
            }
        } catch (e) { }

        return info;
    }

    async doAuth(code?: string) {
        if (code && window.sessionStorage.getItem( CODE_VERIFIER_ID )) {
            var dbxAuth = new DropboxAuth({ clientId: CLIENT_ID });
            dbxAuth.setCodeVerifier(window.sessionStorage.getItem(CODE_VERIFIER_ID));

            const response = await dbxAuth.getAccessTokenFromCode(REDIRECT_URI, code);
            window.localStorage.setItem(TOKEN_ID, response.result.access_token);
            window.localStorage.setItem(REFRESH_TOKEN_ID, response.result.refresh_token);
            window.sessionStorage.removeItem(CODE_VERIFIER_ID);
            return true;
        } else {
            var dbxAuth = new DropboxAuth({ 
                clientId: CLIENT_ID, 
                refreshToken: window.localStorage.getItem(REFRESH_TOKEN_ID)
            });
            if (window.localStorage.getItem(REFRESH_TOKEN_ID)) {
                try {
                    await dbxAuth.refreshAccessToken();
                    window.localStorage.setItem(TOKEN_ID, dbxAuth.getAccessToken());
                    return true;
                } catch (e) {
                    console.log(e);
                }
            }
            const authUrl = await dbxAuth.getAuthenticationUrl(REDIRECT_URI, undefined, 'code', 'offline', undefined, undefined, true);
            window.sessionStorage.setItem(CODE_VERIFIER_ID, dbxAuth.codeVerifier);
            window.location.href = authUrl;
            return false;
        }
    };

    async readJsonFile(fileName: string) {
        const dbx = this.__getDropbox();
        try {
            const res = await dbx.filesDownload({ path: `/${fileName}`});
            if (res.status === 200) {
                const data = await res.result.fileBlob.text();
                return JSON.parse(data);
            }
        } catch(e) {
            if (!(e instanceof DropboxResponseError) || e.status < 404 || e.status > 410) {
                throw e;
            }
        }
    }
    async writeJsonFile(fileName: string, data: Object) {
        const dbx = this.__getDropbox();
        const res  = await dbx.filesUpload({ path: `/${fileName}`, contents: JSON.stringify(data) , mode: 'overwrite' });
        if (res.status === 200) {
            return true;
        }
        return false;
    }
}