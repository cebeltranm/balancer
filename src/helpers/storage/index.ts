import Dropbox from './dropbox';

export function getStorage()  {
    return new Dropbox();
}