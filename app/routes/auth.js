var express = require('express'),
    passport = require('passport');

module.exports = (function() {
    var app = express.Router();

    app.get('/signin', function(req, res){
        res.render('signin');
    });

    app.get('/signup', function(req, res){
        res.render('signup');
    });

    app.post('/signin', passport.authenticate('local-signin', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/signin', // redirect back to the signup page if there is an error
        failureFlash: false // allow flash messages
    }));

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/',
        failureRedirect : '/signup',
        failureFlash: false // allow flash messages
    }));

    app.get('/signout', function(req, res){
        req.logout();
        res.redirect('/');
    });

    return app;
 })();
