/*!
 * YUI Onyx
 * Copyright 2011 Yahoo! Inc.
 * Licensed under the BSD license.
 */

/**
 * Onyx is a library for streaming files
 * over HTTP.
 *
 * @module onyx
 */

/**
 * Dependencies.
 */
var fs = require("fs");
var path = require("path");
var util = require("util");
var assert = require("assert");
var mime = require("./mime");

/**
 * Onyx streams a collection of files
 * as a response to an HTTP request.
 *
 * @class Onyx
 * @constructor
 */
var Onyx = module.exports = function Onyx () {
}

var proto = Onyx.prototype;

/**
 * Returns the values of an object as an array.
 *
 * @method makeArray
 * @protected
 * @param {Object} obj
 * @return {Array}
 */
proto.makeArray = function (obj) {
    var arr = [], key;
    for (key in obj) {
        arr.push(obj[key]);
    }
    return arr;
};

/**
 * Implementation of a fs.stat collector for
 * multiple files.
 *
 * @method statCollector
 * @protected
 * @param {Array} files An array of fille-qualified filenames.
 * @param {Object} source A map of filenames to their `fs.stat` results.
 * @param {Function} cb Callback, 2-arity: error or null, the map of stat results.
 */
proto.statCollector = function statCollector (files, source, cb) {
    var file = files.shift();
    var onyx = this;

    if (file) {
        fs.stat(file, function (err, stat) {
            if (err) {
                return cb(err);
            }
            source[file] = stat;
            statCollector.call(onyx, files, source, cb);
        });
        return;
    }

    var stats = onyx.makeArray(source);

    var result = {
        size : stats.reduce(function (total, stat) {
            return total + stat.size;
        }, 0),
        mtime : stats.reduce(function (latest, stat) {
            return (latest > stat.mtime) ? latest : stat.mtime;
        }, 0),
        files : source
    };

    cb(null, result);
};

/**
 * Aggregate fs#stat across multiple files.
 *
 * The callback recieves an object with:
 *
 * - size: total size of all files
 * - mtime: latest mtime
 * - files: individual stat objects per-file
 *
 * @method mstat
 * @private
 * @param {Array} files
 * @param {Function} cb Callback
 */
proto.mstat = function (files, cb) {
    if (!Array.isArray(files)) {
        throw new Error("files must be an array");
    }

    this.statCollector(files.slice(0), {}, cb);
};

/**
 * Implementation of the actual file transfer.
 */
function xfer (res, files, cb) {
    var file = files.shift();

    if (!file) {
        return cb(null);
    }

    fs.createReadStream(file
    ).on("data", function (chunk) {
        res.write(chunk);
    }).on("error", cb
    ).on("close", function xferClose () {
        xfer(res, files, cb);
    });
}

/**
 * For a given baton containing stats, files, and
 * a HTTP response, stream them to the HTTP response
 * and callback when complete.
 *
 * @method stream
 * @protected
 * @param {Object} baton The baton, containing files, res, and stat.
 * @param {Function} cb Callback, 1-arity, the error or null.
 */
proto.stream  = function stream (baton, cb) {
    var res = baton.res,
        files = baton.files.slice(0);

    xfer(res, files, cb);
};

/**
 * Given a baton of an HTTP request and response,
 * file stats and an array of files, handle the HTTP response
 * by writing the correct headers for the combined files
 * using `stream` to stream the files themselves.
 *
 * Conditional GET and HEAD requests are supported.
 *
 * Scripts, stylesheets and text are assumed to be UTF-8 encoded
 * when sending the Content-Type HTTP header.
 *
 * The request is **not** ended by this function. You must call
 * res.end in your callback function. For why, see streamFiles below.
 *
 * @method handle
 * @private
 * @param {Object} baton A baton, see streamFiles below.
 * @param {Function} cb Callback, 1-arity, the error or null.
 */
proto.handle = function (status, baton, cb) {
    var onyx = this;
    var req = baton.req;
    var res = baton.res;
    var stat = baton.stat;
    var files = baton.files;
    var headers = {};
    var mtime = Date.parse(stat.mtime);

    headers.Date = (new Date()).toUTCString();
    headers["Last-Modified"] = (new Date(stat.mtime)).toUTCString();

    // No inode on ETag, since they vary per-system.
    headers.Etag = JSON.stringify([stat.size, mtime].join("-"));

    // Conditional GET.
    if (req.headers["if-none-match"] === headers.Etag &&
        Date.parse(req.headers["if-modified-since"]) >= mtime) {
        res.writeHead(304, headers);
        cb(null);
    } else if (req.method === "HEAD") {
        res.writeHead(200, headers);
        cb(null);
    } else {
        headers["Content-Type"] = mime.contentTypes[path.extname(files[0]).slice(1)]
                                || "application/octet-stream";

        switch (headers["Content-Type"]) {
            case "application/javascript":
            case "application/xml":
            case "text/html":
            case "text/css":
            case "text/plain":
                headers["Content-Type"] += "; charset=utf-8";
                break;
            default:
                delete baton.prepend;
                delete baton.postpend;
                break;
        }

        var size = stat.size;

        if (baton.prepend) {
            size += baton.prepend.length;
        }

        if (baton.postpend) {
            size += baton.postpend.length;
        }

        headers["Content-Length"] = size;

        res.writeHead(status, headers);

        if (baton.prepend) {
            res.write(baton.prepend);
        }

        onyx.stream(baton, function (err) {
            if (!err && baton.postpend) {
                res.write(baton.postpend);
            }
            cb(err);
        });
    }
};

/**
 * Given an object with an HTTP request, response and
 * file array, respond to the request with all of the files
 * in the same request in the order they appear in the file
 * array.
 *
 * The HTTP request is **not** ended by this function. Call
 * res.end directly in your callback after checking for an
 * error. That's because in the event of a stream error,
 * error handling middleware needs to be able to respond
 * correctly: your callback should call next(err) if an
 * error occurred, instead of calling res.end.
 *
 * The implementation assumes text files are UTF-8 encoded
 * for the purpose of setting the Content-Type header; however,
 * the file contents are sent unchanged byte-for-byte.
 *
 * The baton argument should be an object with the properties:
 *
 * - req: HTTP request.
 * - res: HTTP response.
 * - files: Array of files.
 * - prepend: String to send before the file contents.
 * - postpend: String to send after the file contents.
 *
 * @method streamFiles
 * @param {Object} baton A baton.
 * @param {Function} cb Callback, 1-arity, the error or null.
 */
proto.streamFiles = function (baton, cb) {
    var onyx = this;

    if (baton.files.some(function (file) {
        return decodeURIComponent(file).indexOf("..") !== -1;
    })) {
        // This should be a Bad Request; however, if we got
        // this far with an unsafe filename we'll go with a 500.
        return cb(new Error("Relative paths not allowed."));
    }

    this.mstat(baton.files, function (err, stat) {
        if (err) {
            return cb(err);
        }
        baton.stat = stat;
        onyx.handle(200, baton, cb);
    });
};
