const SERVER_URL = "http://localhost:8181/";
const TOKEN_KEY = "http_server_token";

export default class HttpServerStore {
  getToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  getHeaders(headers: Record<string, string> = {}) {
    const token = this.getToken();
    return token
      ? {
          ...headers,
          Authorization: `Bearer ${token}`,
        }
      : headers;
  }

  async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
    });
    if (response.status === 401) {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    return response;
  }

  async getInfo() {
    const info = {
      type: "HttpServer",
      url: SERVER_URL,
      loggedIn: false,
      offline: true,
      user: {},
    };
    try {
      const res = await fetch(`${SERVER_URL}_ping`);
      if (res.status === 200) {
        info.offline = false;
      }
      if (this.getToken()) {
        const authResponse = await this.request("auth/session");
        info.loggedIn = authResponse.status === 200;
      }
    } catch {}

    return info;
  }

  async doAuth(_code?: string) {
    const res = await fetch(`${SERVER_URL}auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (res.status === 200) {
      const data = await res.json();
      if (data.token) {
        window.localStorage.setItem(TOKEN_KEY, data.token);
        return true;
      }
    }
    return false;
  }

  async logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    return true;
  }

  async readJsonFile(fileName: string) {
    const res = await this.request(fileName);
    if (res.status === 200) {
      try {
        return await res.json();
      } catch (e) {
        console.error(`loading file ${SERVER_URL}${fileName}`, e);
      }
    }
  }
  async writeJsonFile(fileName: string, data: object) {
    const res = await this.request(fileName, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (res.status === 200) {
      return true;
    }
  }
  async getLastModification(_fileName: string) {
    return new Date();
  }

  async listFiles() {
    const res = await this.request("list");
    if (res.status === 200) {
      const data = await res.json();
      return data.map((file: any) => ({
        ...file,
        lastModified: new Date(file.lastModified).getTime(),
      }));
    }
  }
}
