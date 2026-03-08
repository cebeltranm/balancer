const mockWindow = {
  location: {
    protocol: "http:",
    host: "localhost",
    pathname: "/",
  },
};

(globalThis as any).window = mockWindow;
