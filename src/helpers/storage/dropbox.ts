import { Dropbox, DropboxAuth, DropboxResponseError } from 'dropbox';

const CLIENT_ID = 'odmed9kdyvxuszo';
const REDIRECT_URI = `${window.location.protocol}//${window.location.host}/`;
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

    async isLoggedIn() {
        if (window.localStorage.getItem(TOKEN_ID)) {
            const dbx = this.__getDropbox();
            try {
                const res = await dbx.checkUser({});
                if (res.status==200) {
                    return true;
                }
            } catch(e) {
                if ( !(e instanceof DropboxResponseError) || e.status !== 401) {
                    return undefined;
                }
            }
        }
        return false;
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
            console.log('step2');
            var dbxAuth = new DropboxAuth({ 
                clientId: CLIENT_ID, 
                refreshToken: window.localStorage.getItem(REFRESH_TOKEN_ID)
            });
            if (window.localStorage.getItem(REFRESH_TOKEN_ID)) {
                console.log('step3');
                try {
                    await dbxAuth.refreshAccessToken();
                    window.localStorage.setItem(TOKEN_ID, dbxAuth.getAccessToken());
                    return true;
                } catch (e) {
                    console.log(e);
                }
            }
            console.log('step4');
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
        console.log('res', res);
        if (res.status === 200) {
            return true;
        }
        return false;
    }

    async test() {
        const dbx = this.__getDropbox();
        const files = await dbx.filesListFolder({path: ''});
        console.log(files);

        // await dbx.filesUpload({ path: '/test.json', contents: "test" });

        // Apps › Balancer App
    }
}