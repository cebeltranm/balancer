
const SERVER_URL = 'http://localhost:8181/';

export default class HttpServerStore {

    async isLoggedIn() {
        try {
            const res = await fetch(`${SERVER_URL}_ping`);
            if (res.status === 200) {
                return true;
            };
        } catch (e) { }
    }

    async doAuth(code?: string) {
        return true;
    };

    async readJsonFile(fileName: string) {
        const res = await fetch(`${SERVER_URL}${fileName}`);
        if (res.status === 200) {
            const data = await res.json();
            return data;
        }
    }
    async writeJsonFile(fileName: string, data: Object) {
        const res = await fetch(`${SERVER_URL}${fileName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (res.status === 200) {
            return true;
        }
    }
}