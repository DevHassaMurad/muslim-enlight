export async function accountRequest(path, options = {}) {
    const response = await fetch(`/api${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to complete account request.');
    return data;
}
