/*!
 * YUI Mocha
 * Copyright 2011 Yahoo! Inc.
 * Licensed under the BSD license.
 */

/**
 * Provides streaming file functions.
 *
 * Connect middleware.
 */
module.exports = function onyxProvider (onyx) {

    return function streamFilesFilter (req, res, next) {

        /**
         * Respond to this request by sending files.
         *
         * @param {Array|String} file The fully-qualified path to the file.
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
