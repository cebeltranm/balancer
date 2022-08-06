import Dropbox from './dropbox';
import HttpServerStore from './http_server';

export function getStorage()  {
    if (window.location.host === 'localhost:3000') {
        return new HttpServerStore();
    }
    return new Dropbox();
}