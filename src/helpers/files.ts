export async function readJsonFile(file: any) {
    try {
        const res = await fetch(`http://localhost:8181/${file}`);
        if (res.status === 200) {
            return res.json();
        }
    } catch (e) {
        console.log(e);
    }
}

export async function writeJsonFile(file: any, data: Object) {
    try {
        const res = await fetch(`http://localhost:8181/${file}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (res.status === 200) {
            return true;
        }
    } catch (e) {
        console.log(e);
    }
    return false;
}
