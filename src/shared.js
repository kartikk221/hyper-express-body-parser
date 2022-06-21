const zlib = require('zlib');
const iconv = require('iconv-lite');
const unpipe = require('unpipe');
const destroy = require('destroy');
const type_is = require('type-is');
const raw_body = require('raw-body');
const content_type = require('content-type');

/**
 * @typedef {Object} ParserConditions
 * @property {Boolean} inflate - Whether or not to inflate the body.
 * @property {Number} limit - The maximum size of the body in bytes.
 * @property {function():boolean} match_type - A function that returns whether the incoming request should be parsed or not based on content type.
 * @property {function():boolean=} verify_body - A function that returns whether the incoming body should be parsed or not based on the request.
 * @property {String=} base_encoding - The base encoding to use when parsing the incoming body.
 * @property {Function=} verify_encoding - A function that is used to verify the charset encoding of an incoming request.
 */

/**
 * @typedef {Object} BodyAttempt
 * @property {Buffer} buffer - The buffer containing the body data.
 * @property {String} charset - The charset encoding of the body data.
 */

/**
 * Returns whether an incoming request should be parsed or not.
 *
 * @param {HyperExpress.Request} request
 * @param {ParserConditions} conditions
 * @returns {Boolean}
 */
function validate_request(request, conditions) {
    // Destructure the conditions object with relevant properties
    const { match_type } = conditions;

    // Ensure the request body has not already been received/parsed
    if (request.received) return false;

    // Do not parse the request if there is no body to parse
    if (!type_is.hasBody(request)) return false;

    // Do not parse the request if it doesn't match the appropriate type
    if (!match_type(request)) return false;

    return true;
}

/**
 * Attempts to retrieve the body buffer from the incoming request.
 * Automatically asserts and applies the provided set of conditions.
 *
 * @param {HyperExpress.Request} request
 * @param {HyperExpress.Response} response
 * @param {ParserConditions} conditions
 * @returns {Promise<BodyAttempt|undefined>}
 */
async function attempt_body(request, response, conditions) {
    // Destructure appropriate properties from the conditions object
    const { inflate, limit, verify_body, base_encoding, verify_encoding } = conditions;

    // Determine content encoding from the request headers
    const content_encoding = (request.headers['content-encoding'] || 'identity').toLowerCase();

    // Determine the request encoding from the content-type header with a fallback to the base encoding
    const request_encoding = content_type.parse(request.headers['content-type']).parameters.charset || base_encoding;

    // Return an HTTP 415 error if we receive an unsupported compression or charset encoding
    const bad_encoding = verify_encoding ? !verify_encoding(request_encoding) : false;
    const bad_compression = inflate === false && content_encoding !== 'identity';
    if (bad_encoding || bad_compression) return response.status(415).send();

    // Attempt to stream the incoming body from HyperExpress with the provided conditional limit
    if (request._stream_with_limit(limit)) {
        // Read the incoming body data into a buffer
        let buffer;
        if (content_encoding === 'identity') {
            // Retrieve the raw body buffer directly from HyperExpress
            // This is more memory efficient than consuming/processing the chunks from the request stream
            buffer = await request.buffer();
        } else {
            // Initialize a decompression stream which will decompress the incoming body data
            let stream;
            switch (content_encoding) {
                case 'deflate':
                    // Create a deflate decompression stream and pipe the request stream into it
                    stream = zlib.createInflate();
                    request.pipe(stream);
                    break;
                case 'gzip':
                    // Create a gzip decompression stream and pipe the request stream into it
                    stream = zlib.createGunzip();
                    request.pipe(stream);
                    break;
                default:
                    // Return an HTTP 415 error as the encoding is not supported
                    return response.status(415).send();
            }

            // Read the decompression stream into a buffer
            try {
                // Utilize the raw-body module to read the decompression stream into a buffer
                buffer = await new Promise((resolve, reject) =>
                    raw_body(
                        stream,
                        {
                            length: stream.length, // The decoded length of the incoming body
                            limit, // The maximum size of the incoming body data in bytes
                            encoding: typeof verify_body == 'function' ? null : base_encoding,
                        },
                        (error, body) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(body);
                            }
                        }
                    )
                );
            } catch (error) {
                // Destroy the decompression stream
                destroy(stream, true);

                // Unpipe destinations from the request readable stream
                unpipe(request);

                // Flush any remaining data from the decompression stream
                request._stream_flush();

                // Handle the error type and respond to the request with appropriate response
                switch (error.type) {
                    case 'encoding.unsupported':
                        // Return an HTTP 415 error as the encoding is not supported
                        return response.status(415).send();
                    default:
                        // Return an HTTP 400 error as this is a bad request according to raw-body module
                        return response.status(400).send();
                }
            }
        }

        // Verify the received buffer against the provided verify_body function
        if (typeof verify_body == 'function' && verify_body(request, response, buffer, content_encoding) !== true) {
            // Return an HTTP 403 error as the body verification failed
            return response.status(403).send();
        }

        // Decode the buffer from the provided base encoding
        if (request_encoding) {
            try {
                // Attempt to decode the buffer from the provided base encoding with the iconv-lite module
                buffer = iconv.decode(buffer, request_encoding);
            } catch (error) {
                // Return an HTTP 400 error as the encoding parsing failed
                return response.status(400).send();
            }
        }

        return {
            buffer,
            charset: request_encoding,
        };
    } else {
        // Hold execution till we have successfully ended the request with a 413 status code
        await new Promise((resolve) =>
            request.on('limit', (bytes, flushed) => {
                // Ensure the body has been completely flushed
                // Ensure the response has not already been initiated
                if (flushed && !response.initiated) {
                    // Send an HTTP 413 status code to the client signifying that the request body is too large
                    response.status(413).send();
                    resolve();
                }
            })
        );
    }
}

module.exports = {
    validate_request,
    attempt_body,
};
