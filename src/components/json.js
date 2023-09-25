const bytes = require('bytes');
const type_is = require('type-is');

const { validate_request, attempt_body } = require('../shared.js');

/**
 * Creates a JSON (Object) body parsing middleware which will parse incoming body data into the Request.body property under provided option based conditions.
 * Note! This middleware will send a 400 HTTP Response if JSON parsing or validation fails.
 *
 * @param {Object} options - Options object for Raw body parser
 * @param {Function=} options.reviver The reviver option is passed to the JSON.parse function as its second argument.
 * @param {Boolean=} options.strict When set to `true`, will only accept arrays and objects; when `false`, will accept any JSON type. Defaults to `true`.
 * @param {Boolean=} options.inflate When set to `true`, then deflated (compressed) bodies will be inflated; when `false`, deflated bodies are rejected. Defaults to `true`.
 * @param {(String|Number)=} options.limit Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'.
 * @param {(String|Function)=} options.type The `type` option is used to determine what media type the middleware will parse. Can be a string or a function. If a function, it will be passed the `Request` object and should return a boolean. If a string, it will be used to match the media type. Defaults to 'application/json'.
 * @param {function(HyperExpress.Request, HyperExpress.Response, Buffer, String):boolean=} options.verify When set, the verify callback is called before the body is parsed. If the callback returns false, the body is rejected and the request is aborted with a 403 HTTP response.
 */
function create_json_parser(options = {}) {
    // Destructure the options object with defaults
    const { reviver, strict = true, inflate = true, limit = '100kb', type = 'application/json', verify } = options;

    // Ensure the type property is either a string or a function
    if (typeof type !== 'string' && typeof type !== 'function')
        throw new Error('HyperExpress.BodyParser.text(options) -> options.type must be a string or function');

    // Ensure the verify property is a function when it exists
    if (verify && typeof verify !== 'function')
        throw new Error('HyperExpress.BodyParser.text(options) -> options.verify must be a function');

    // Ensure the reviver property is a function when it exists
    if (reviver && typeof reviver !== 'function')
        throw new Error('HyperExpress.BodyParser.text(options) -> options.reviver must be a function when defined');

    // Generate parsed properties from the options utilized during parsing
    const conditions = {
        base_encoding: 'utf-8',
        verify_encoding: (encoding) => encoding && encoding.startsWith('utf-'), // assert charset per RFC 7159 sec 8.1
        verify_body: verify,
        inflate: inflate === true,
        limit: typeof limit === 'number' ? limit : bytes.parse(limit),
        match_type: typeof type === 'function' ? type : (req) => Boolean(type_is(req, type)),
    };

    // Return the middleware function
    return async (request, response) => {
        // Initialize the body property to an empty String if it doesn't exist
        if (!request.body) request.body = {};

        // Validate this request to determine if we should parse it
        // Note: This method will automatically send the appropriate error HTTP responses under appropriate scenarios
        if (validate_request(request, conditions)) {
            // Attempt to read the incoming request body
            const attempt = await attempt_body(request, response, conditions);
            if (attempt) {
                // Destructure the attempt object
                const { buffer, charset } = attempt;

                // Convert to the string version of the buffer with the appropriate charset
                const string = buffer.toString(charset);

                // Iif strict parsing is enabled and the text does not begin with a valid Array/Object character, send a 400 HTTP Response
                if (strict === true && string[0] !== '{' && string[0] !== '[') return response.status(400).send();

                // Attempt to safely parse the text into a JSON object
                try {
                    // Pass the reviver as the second argument as specified in docs
                    request.body = JSON.parse(string, reviver);
                } catch (error) {
                    // Send a 400 HTTP Response as the parsing failed
                    return response.status(400).send();
                }
            }
        }
    };
}

module.exports = create_json_parser;
