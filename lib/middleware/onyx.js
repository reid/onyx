/*!
 * YUI Onyx
 * Copyright 2011 Yahoo! Inc.
 * Licensed under the BSD license.
 */

/**
 * Provides Connect middleware that
 * provides `res.streamFiles`.
 *
 * @method onyxProvider
 * @param {Onyx} onyx An instance of Onyx.
 */
module.exports = function onyxProvider (onyx) {

    /**
     * Connect middleware that provides `res.streamFiles`.
     */
    return function streamFilesFilter (req, res, next) {

        /**
         * Respond to this request by sending files.
         *
         * If a file isn't found or is a directory, don't handle the request
         * and pass through to the next middleware. (This usually yields a 404.)
         *
         * @param {Array|String} files The fully-qualified path to the file.
         * @param {Object} config Configuration to pass through to Onyx.
         */
        res.streamFiles = function streamFilesResponder (files, config) {
            if (!config) {
                config = {};
            }

            config.req = req;
            config.res = res;
            config.files = files;

            onyx.streamFiles(config, function (err) {
                if (err) {
                    if (err.code === "ENOENT" || err.code === "EISDIR") {
                        next();
                    } else {
                        next(err);
                    }
                    return;
                }
                res.end();
            });
        };

        next();
    };

};
