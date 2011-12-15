/*!
 * YUI Onyx
 * Copyright 2011 Yahoo! Inc.
 * Licensed under the BSD license.
 */

var Onyx = exports.Onyx = require("./onyx");
var provider = exports.provider = require("./middleware/onyx");

exports.createProvider = function () {
    return provider(new Onyx());
};
