var express  = require('express'),
    bcrypt = require('bcrypt'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    async = require('async'),
    _ = require('underscore'),
    moment = require('moment'),
    config = require('../config/config.js'),
    User  = require('../models/User'),
    Blog  = require('../models/Blog'),
    Post  = require('../models/Post'),
    Queue  = require('../models/Queue'),
    Stat  = require('../models/Stat'),
    TokenSet  = require('../models/TokenSet'),
    Notification  = require('../models/Notification'),
    PostSet = require('../models/PostSet');

module.exports = (function() {
    var app = express.Router();

    app.get('/blog/:blogUrl/stats/public', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                Stat.find({ blogId: blog.id } , '-_id -__v -blogId').sort('-date').limit(384).exec(function(err, stats){
                    if(err) console.log(err);
                    Stat.findOne({ blogId: blog.id } , '-_id -__v -blogId').sort('date').exec(function(err, firstStat){
                        if(err) console.log(err);
                        //- This is for the weekly gains and stuff
                        var current = stats[0],
                            currentFollowers = current.followerCount,
                            daysBetweenFirstStatAndNow = Math.round(Math.abs((new Date(stats[0].date).getTime() - new Date(firstStat.date).getTime())/(24*60*60*1000))),
                            gainsPerDay = Math.floor((currentFollowers - firstStat.followerCount) / daysBetweenFirstStatAndNow),
                            lastUpdated = Math.floor((new Date().getTime() - new Date(stats[0].date).getTime())/ 60000);
                        res.render('blog/public', {
                            currentBlog: blog,
                            stats: stats,
                            statTable: {
                                forecast: {
                                    week: currentFollowers + (gainsPerDay * 7),
                                    month: currentFollowers + (gainsPerDay * 30),
                                    year: currentFollowers + (gainsPerDay * 365)
                                },
                                lastUpdated: lastUpdated < 2 ? 'just now' : lastUpdated + ' minutes ago',
                                currentFollowers: currentFollowers,
                                html: []
                            }
                        });
                    });
                });
            } else {
                res.send('This blog doesn\'t exist.');
            }
        });
    });

    app.get('*', function(req, res, next){
        if (req.isAuthenticated()) { return next(); }
        res.redirect('/');
    });

    app.get('/blog/:blogUrl/*', function(req, res, next){
        function isUserAllowed (blogUrl){
            for (var i = 0; i < req.user.tokenSet.length;i++){
                for (var j = 0; j < req.user.tokenSet[i].blogs.length;j++){
                    if(req.user.tokenSet[i].blogs[j].url.toLowerCase() == blogUrl.toLowerCase()) return true;
                }
            }
        }
        if(isUserAllowed(req.params.blogUrl)){
            next();
        } else {
            res.send('You do not own this blog!');
        }
    });

    app.get('/blog/:blogUrl/stats', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                Stat.find({ blogId: blog.id } , '-_id -__v -blogId').sort('-date').limit(384).exec(function(err, stats){
                    if(err) console.log(err);
                    Stat.findOne({ blogId: blog.id } , '-_id -__v -blogId').sort('date').exec(function(err, firstStat){
                        if(err) console.log(err);
                        //- This is for the weekly gains and stuff
                        var current = stats[0],
                            currentFollowers = current.followerCount,
                            daysBetweenFirstStatAndNow = Math.round(Math.abs((new Date(stats[0].date).getTime() - new Date(firstStat.date).getTime())/(24*60*60*1000))),
                            gainsPerDay = Math.floor((currentFollowers - firstStat.followerCount) / daysBetweenFirstStatAndNow),
                            lastUpdated = Math.floor((new Date().getTime() - new Date(stats[0].date).getTime())/ 60000);
                        res.render('blog/index', {
                            currentBlog: blog,
                            stats: stats,
                            statTable: {
                                forecast: {
                                    week: currentFollowers + (gainsPerDay * 7),
                                    month: currentFollowers + (gainsPerDay * 30),
                                    year: currentFollowers + (gainsPerDay * 365)
                                },
                                lastUpdated: lastUpdated < 2 ? 'just now' : lastUpdated + ' minutes ago',
                                currentFollowers: currentFollowers,
                                html: []
                            }
                        });
                    });
                });
            } else {
                res.send('This blog doesn\'t exist.');
            }
        });
    });

    app.get('/blog/:blogUrl/posts', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                PostSet.find({blogId: blog.id}).populate('posts').limit(100).exec(function(err, postSets){
                    if(err) console.log(err);
                    if(postSets.length){
                        res.render('blog/posts', {
                            postSets: postSets
                        });
                    } else {
                        res.send('This blog doesn\'t have any posts.');
                    }
                });
            } else {
                res.send('This blog doesn\'t exist.');
            }
        });
    });

    app.get('/blog/:blogUrl/counters', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                var followersCounterScript = '<script src="' + config.env.baseUrl + '/api/blog/counter/followers/' + blog.url + '?class=btn&name=followers&fromTop=26px&fromRight=2px" type="text/javascript"></script>';
                var onlineCounterScript = '<script src="' + config.env.baseUrl + '/api/blog/counter/online/' + blog.url + '?class=btn&name=followers&fromTop=48px&fromRight=2px" type="text/javascript"></script>';
                var viewsCounterScript = '<script src="' + config.env.baseUrl + '/api/blog/counter/views/' + blog.url + '?class=btn&name=followers&fromTop=70px&fromRight=2px" type="text/javascript"></script>';
                res.render('blog/counters', {
                    blog: blog,
                    counters: {
                        followers: followersCounterScript,
                        online: onlineCounterScript,
                        views: viewsCounterScript
                    }
                });
            } else {
                res.send('This blog doesn\'t exist.');
            }
        });
    });

    app.get('/blog/:blogUrl/queues', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                async.parallel([
                    function(callback){
                        Queue.find({blogId: blog._id}).exec(function(err, queues){
                            if(err) callback(err);
                            callback(null, queues);
                        });
                    },
                    function(callback){
                        PostSet.find({blogId: blog.id}).sort('-_id').exec(function(err, postSets){
                            if(err) callback(err);
                            callback(null, postSets);
                        });
                    }
                ],
                function(err, results){
                    if(err) console.log(err);
                    res.render('blog/queues/index', {
                        blog: blog,
                        queues: results[0],
                        postSets: results[1]
                    });
                });
            } else {
                res.send('This blog doesn\'t exist.');
            }
        });
    });

    app.post('/blog/:blogUrl/queues', function(req, res){
        Blog.findOne({url: req.params.blogUrl}, function(err, blog){
            if(req.body.interval) {
                var interval = ((req.body.interval > 0) && (req.body.interval <= 250)) ? req.body.interval : 250;
                var startHour = ((req.body.startHour > 0) && (req.body.startHour <= 24)) ? req.body.startHour : 0;
                var endHour = ((req.body.endHour > 0) && (req.body.endHour <= 24)) ? req.body.endHour : 24;
                var queue = new Queue({
                    blogId: blog.id,
                    interval: interval,
                    startHour: startHour,
                    endHour: endHour,
                    backfill: false
                });
                queue.save();
                res.redirect('/blog/' + req.params.blogUrl + '/queues');
            } else {
                res.send('You need to set an amount per 24 hours.');
            }
        });
    });

    app.post('/blog/:blogUrl/queues/:queueId/delete', function(req, res){
        Queue.findOne({_id: req.params.queueId}, function(err, queue){
            if(err) console.log(err);
            queue.remove();
            res.redirect('/blog/' + req.params.blogUrl + '/queues');
        });
    });

    return app;
})();
