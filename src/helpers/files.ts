export function readJsonFile(file: any) {
    return fetch(`http://localhost:8181/${file}`)
        .then(res => res.json());
}