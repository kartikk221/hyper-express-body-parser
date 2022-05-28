const bytes = require('bytes');
const type_is = require('type-is');

/**
 *
 * @param {Object} options - Options object for Raw body parser
 * @param {Boolean} options.inflate When set to `true`, then deflated (compressed) bodies will be inflated; when `false`, deflated bodies are rejected. Defaults to `true`.
 * @param {String|Number} options.limit Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'.
 * @param {String|Function} options.type The `type` option is used to determine what media type the middleware will parse. Can be a string or a function. If a function, it will be passed the `Request` object and should return a boolean. If a string, it will be used to match the media type. Defaults to 'application/octet-stream'.
 */
function get_raw_parser(options = {}) {
    // Destructure the options object with defaults
    const { inflate = true, limit = '100kb', type = 'application/octet-stream', verify } = options;

    // Ensure the type property is either a string or a function
    if (typeof type !== 'string' && typeof type !== 'function')
        throw new Error('HyperExpress.BodyParser.raw(options) -> options.type must be a string or function');

    // Ensure the verify property is a function when it exists
    if (verify && typeof verify !== 'function')
        throw new Error('HyperExpress.BodyParser.raw(options) -> options.verify must be a function');

    // Generate parsed properties from the options utilized during parsing
    const body_inflate = inflate === true;
    const body_type_check = typeof type === 'function' ? type : (req) => type_is(req, type);
    const body_limit_bytes = typeof limit === 'number' ? limit : bytes.parse(limit);

    // Return the middleware function
    return async (request, response) => {
        // Initialize the body property to an empty Buffer if it doesn't exist
        if (!request.body) request.body = Buffer.allocUnsafe(0);

        // Ensure that the request has a body
        if (!type_is.hasBody(request)) return;
    };
}
