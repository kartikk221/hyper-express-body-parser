declare module 'hyper-express-body-parser' {
    import HyperExpress from 'hyper-express'

    type encodings =
                     'ascii'
                   | 'base64'
                   | 'hex'
                   | 'latin1'
                   | 'ucs2'
                   | 'utf16le'
                   | 'utf8'


    export function json(options?: {
        /** The reviver option is passed to the JSON.parse function as its second argument. */
        reviver?: Function,
        /** When set to `true`, will only accept arrays and objects; when `false`, will accept any JSON type. Defaults to `true`. */
        strict?: boolean,
        /** When set to `true`, then deflated (compressed) bodies will be inflated; when `false`, deflated bodies are rejected. Defaults to `true`. */
        inflate?: boolean,
        /** Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'. */
        limit?: string,
        /** The `type` option is used to determine what media type the middleware will parse. Can be a string or a function. If a function, it will be passed the `Request` object and should return a boolean. If a string, it will be used to match the media type. Defaults to 'application/json'. */
        type?: string,
        /**  When set, the verify callback is called before the body is parsed. If the callback returns false, the body is rejected and the request is aborted with a 403 HTTP response.*/
        verify?: function(HyperExpress.Request, HyperExpress.Response): boolean
    })

    export function raw(options?: {
        /** When set to `true`, then deflated (compressed) bodies will be inflated; when `false`, deflated bodies are rejected. Defaults to `true`. */
        inflate?: boolean,
        /** Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'. */
        limit?: string,
        /** The `type` option is used to determine what media type the middleware will parse. Can be a string or a function. If a function, it will be passed the `Request` object and should return a boolean. If a string, it will be used to match the media type. Defaults to 'application/json'. */
        type?: string,
        /**  When set, the verify callback is called before the body is parsed. If the callback returns false, the body is rejected and the request is aborted with a 403 HTTP response.*/
        verify?: function(HyperExpress.Request, HyperExpress.Response): boolean
    })

    export function text(options?: {
        /**  The default charset to use when decoding a request body if one is not specified in the content-type header. Defaults to 'utf-8'*/
        defaultCharset?: encodings | (string & {}),
        /** When set to `true`, then deflated (compressed) bodies will be inflated; when `false`, deflated bodies are rejected. Defaults to `true`. */
        inflate?: boolean,
        /** Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'. */
        limit?: string,
        /** The `type` option is used to determine what media type the middleware will parse. Can be a string or a function. If a function, it will be passed the `Request` object and should return a boolean. If a string, it will be used to match the media type. Defaults to 'application/json'. */
        type?: string,
        /**  When set, the verify callback is called before the body is parsed. If the callback returns false, the body is rejected and the request is aborted with a 403 HTTP response.*/
        verify?: function(HyperExpress.Request, HyperExpress.Response): boolean
    })

}