/*!
 * YUI Mocha
 * Copyright 2011 Yahoo! Inc.
 * Licensed under the BSD license.
 */

var assert = require("assert");
var vows = require("vows");
var fs = require("fs");
var mockWritableStream = require("./lib/writable-stream.js");

var Onyx = require("../lib/index").Onyx;

function mockRequest () {
    return {
        headers : {}
    };
}

var files = [__dirname + "/vendor/fixture.js", __dirname + "/vendor/fixture-again.js"];
var prepend = "FOOBAR!";
var postpend = "QUUX!";

vows.describe("Onyx").addBatch({
    "A file collection" : {
        topic : function () {
            return [".js", "-again.js"].map(function (f) {
                return __dirname + "/vendor/fixture" + f;
            });
        },
        "to Onyx mstat" : {
            topic : function (lastTopic) {
                var vow = this;
                var onyx = new Onyx();
                onyx.mstat(lastTopic, function (err, topic) {
                    topic._collection = lastTopic;
                    vow.callback(err, topic);
                });
            },
            "yields the total size of all files" : function (topic) {
                assert.equal(topic.size, 36);
            },
            "yields the latest mtime of all files" : function (topic) {
                var fileName,
                    file,
                    latest = topic.mtime.getTime();
                for (fileName in topic.files) {
                    file = topic.files[fileName];
                    assert.strictEqual(latest >= file.mtime.getTime(), true);
                }
            },
            "yields the stats of all files" : function (topic) {
                Object.keys(topic.files).forEach(function (f) {
                    assert.include(topic._collection, f);
                });
            }
        }
    },
    "A writable stream" : {
        topic : mockWritableStream(),
        "is valid" : function (stream) {
            assert.isFunction(stream.write);
        },
        "when streamed to by Onyx streamFiles" : {
            topic : function (lastTopic) {
                var vow = this;
                var mh = new Onyx();
                mh.streamFiles({
                    req : mockRequest(),
                    res : lastTopic,
                    files : files,
                    prepend : prepend,
                    postpend : postpend
                }, function (err) {
                    vow.callback(err, lastTopic);
                });
            },
            "contains valid data" : function (topic) {
                assert.ok(topic.$store);
            },
            "contains correct data" : function (topic) {
                var content = prepend;
                files.forEach(function (file) {
                    content += fs.readFileSync(file, "utf8");
                });
                content += postpend;
                assert.equal(topic.$store, content);
            } 
        },
        "given an unsafe file path containing '..'" : {
            topic : function () {
                return ["./../../../../../etc/passwd"];
            },
            "when streamed to by streamFiles" : {
                topic : function (badFiles, lastTopic) {
                    var vow = this;
                    var mh = new Onyx();
                    mh.streamFiles({
                        req : mockRequest(),
                        res : lastTopic,
                        files : badFiles,
                        prepend : prepend,
                        postpend : postpend
                    }, function (err) {
                        if (!err) {
                            vow.callback(new Error("Error expected."));
                        } else {
                            vow.callback(null, err);
                        }
                    });
                },
                "yields an error" : function (err) {
                   assert.ok(err);
                }
            }
        }
    }
}).export(module);

