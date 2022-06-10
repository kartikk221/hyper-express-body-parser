const bytes = require('bytes');
const type_is = require('type-is');
const content_type = require('content-type');

const { validate_request, attempt_body_buffer } = require('../shared.js');

/**
 * Creates a text (String) body parsing middleware which will parse incoming body data into the Request.body property under provided option based conditions.
 *
 * @param {Object} options - Options object for Raw body parser
 * @param {String} options.defaultCharset The default charset to use when decoding a request body if one is not specified in the content-type header. Defaults to 'utf-8'.
 * @param {Boolean} options.inflate When set to `true`, then deflated (compressed) bodies will be inflated; when `false`, deflated bodies are rejected. Defaults to `true`.
 * @param {String|Number} options.limit Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'.
 * @param {String|Function} options.type The `type` option is used to determine what media type the middleware will parse. Can be a string or a function. If a function, it will be passed the `Request` object and should return a boolean. If a string, it will be used to match the media type. Defaults to 'application/octet-stream'.
 * @param {function(HyperExpress.Request, HyperExpress.Response, Buffer, String):boolean} options.verify When set, the verify callback is called before the body is parsed. If the callback returns false, the body is rejected and the request is aborted with a 403 HTTP response.
 */
function create_text_parser(options = {}) {
    // Destructure the options object with defaults
    const { inflate = true, limit = '100kb', defaultCharset = 'utf-8', type = 'text/plain', verify } = options;

    // Ensure the type property is either a string or a function
    if (typeof type !== 'string' && typeof type !== 'function')
        throw new Error('HyperExpress.BodyParser.text(options) -> options.type must be a string or function');

    // Ensure the verify property is a function when it exists
    if (verify && typeof verify !== 'function')
        throw new Error('HyperExpress.BodyParser.text(options) -> options.verify must be a function');

    // Generate parsed properties from the options utilized during parsing
    const conditions = {
        base_encoding: defaultCharset,
        verify_body: verify,
        inflate: inflate === true,
        limit: typeof limit === 'number' ? limit : bytes.parse(limit),
        match_type: typeof type === 'function' ? type : (req) => Boolean(type_is(req, type)),
    };

    // Return the middleware function
    return async (request, response) => {
        // Initialize the body property to an empty String if it doesn't exist
        if (!request.body) request.body = '';

        // Validate this request to determine if we should parse it
        // Note: This method will automatically send the appropriate error HTTP responses under appropriate scenarios
        if (validate_request(request, conditions)) {
            // Attempt to read the incoming request body as a Buffer
            const buffer = await attempt_body_buffer(request, response, conditions);
            if (buffer) {
                // Write the body buffer to the request body property
                request.body = buffer;
            }
        }
    };
}

module.exports = create_text_parser;
