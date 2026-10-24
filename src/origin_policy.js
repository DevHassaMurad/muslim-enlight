/** Shared origin policy for API reads, writes, cookies and preflight requests. */
function createOriginPolicy({ origins = process.env.CORS_ORIGINS } = {}) {
    const defaults =
        process.env.NODE_ENV === 'production'
            ? []
            : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    const allowed = new Set(
        origins === undefined
            ? defaults
            : origins
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
    );
    for (const origin of allowed) {
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
            throw new Error(
                'CORS_ORIGINS must contain exact HTTP(S) origins without paths or trailing slashes.'
            );
        }
    }
    const methods = ['GET', 'POST', 'DELETE', 'OPTIONS'];

    return function originPolicy(req, res, next) {
        const origin = req.headers.origin;
        res.vary('Origin');
        if (origin) {
            const sameOrigin = origin === `${req.protocol}://${req.headers.host}`;
            if (!sameOrigin && !allowed.has(origin)) {
                return res.status(403).json({
                    error: 'This frontend origin is not allowed.',
                    code: 'ORIGIN_NOT_ALLOWED',
                });
            }
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        if (req.method === 'OPTIONS') {
            const requestedMethod = req.headers['access-control-request-method'];
            const requestedHeaders = (req.headers['access-control-request-headers'] || '')
                .split(',')
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);
            res.vary('Access-Control-Request-Method');
            res.vary('Access-Control-Request-Headers');
            if (
                (requestedMethod && !methods.includes(requestedMethod)) ||
                requestedHeaders.some((header) => header !== 'content-type')
            ) {
                return res.status(403).json({ error: 'Unsupported preflight request.' });
            }
            res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Max-Age', '600');
            return res.sendStatus(204);
        }
        next();
    };
}

module.exports = { createOriginPolicy };
