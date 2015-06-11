var express  = require('express'),
    bcrypt = require('bcrypt'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    async = require('async'),
    _ = require('underscore'),
    moment = require('moment'),
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

    app.get('*', function(req, res, next){
        if (req.isAuthenticated()) { return next(); }
        res.redirect('/signin');

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

    app.get('/blog/:blogUrl', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                Stat.find({ blogId: blog.id }).sort('-date').limit(168).exec(function(err, stats){
                    if(err) console.log(err);
                    res.render('blog/index', {
                        blog: blog,
                        stats: stats
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

    app.get('/blog/:blogUrl/posts/del', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                PostSet.findOne({blogId: blog.id}).populate('posts').limit(100).exec(function(err, postSet){
                    if(err) console.log(err);
                    if(postSet){
                        postSet.posts[0].remove();
                        res.sendStatus(200);
                    } else {
                        res.send('cant find any posts');
                    }
                });
            }
        });
    });

    app.get('/blog/:blogUrl/queues', function(req, res){
        Blog.findOne({url: req.params.blogUrl}).exec(function(err, blog){
            if(err) console.log(err);
            if(blog){
                Queue.find({blogId: blog._id}).exec(function(err, queues){
                    if(err) console.log(err);
                    if(queues){
                        res.render('blog/queues/index', {
                            blog:blog,
                            queues: queues
                        });
                    } else {
                        res.send('This blog doesn\'t have any queues.');
                    }
                });
            } else {
                res.send('This blog doesn\'t exist.');
            }
        });
    });

    app.get('/blog/:blogUrl/followers', function(req, res){

    });

    app.get('/blog/:blogUrl/queues/new', function(req, res){
        res.render('blog/queues/new');
    });

    app.post('/blog/:blogUrl/queues/new', function(req, res){
        res.redirect('/blog/' + req.params.blogUrl + '/queues');
    });

    return app;
})();
