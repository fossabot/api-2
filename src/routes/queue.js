import Joi from 'joi';
import HTTPError from 'http-errors';
import {Router} from 'express';
import {Blog, Post, Queue} from '../models';
import {isAuthenticated, resolveBlogUrl} from '../middleware';
import {flatten} from '../utils';

const router = new Router();

router.use(isAuthenticated);

router.get('/', async (req, res, next) => {
    const blogs = flatten(req.user.tumblr.map(tumblr => tumblr.blogs));
    const queues = await Queue.find({
        blogs: {
            $in: blogs
        }
    }).populate('blogId', '_id url').exec().catch(next);

    if (queues.length >= 1) {
        return res.send({queues});
    }
    return next(new HTTPError.NotFound(`No queues found.`));
});

router.get('/:blogUrl', resolveBlogUrl, async (req, res, next) => {
    const blogId = req.blog._id;
    const queues = await Queue.find({blogId}).exec().catch(next);
    res.send({queues});
});

router.post('/', async (req, res, next) => {
    const isUserAllowed = blog => req.user.tumblr.filter(tumblr => tumblr.blogs.filter(_blog => _blog === blog._id));

    Joi.validate({
        blogs: req.body.blogs,
        interval: req.body.interval,
        startHour: req.body.startHour,
        endHour: req.body.endHour
    }, {
        blogs: Joi.array().items(Joi.string().required()).min(1).max(50).required(),
        interval: Joi.number().min(1).max(250).required(),
        startHour: Joi.number().min(0).max(23).required(),
        endHour: Joi.number().min(0).max(23).required()
    }, async (error, values) => {
        if (error) {
            return next(error);
        }

        const {blogs, interval, startHour, endHour} = values;

        // Removes all blogs not found on current user's req.user object
        blogs.filter(blog => isUserAllowed(blog));

        const queue = new Queue({
            blogs,
            interval,
            startHour,
            endHour
        });
        queue.save(error => {
            if (error) {
                return res.send(new HTTPError.InternalServerError(`Queue could not be saved.`));
            }
            return res.status(201).send({queue});
        });
    });
});

router.post('/:queueId', async (req, res, next) => {
    const postCount = await Post.count({blogId: req.blog._id}).exec().catch(next);
    const posts = await Post.find({blogId: req.blog._id}).exec().catch(next);
    posts.forEach(async post => {
        post.postOrder = Math.floor(Math.random() * (postCount - 1));
        await post.save();
    }).then(() => {
        res.redirect('/blog/' + req.blog.url + '/queues');
    });
});

router.delete('/:queueId', async (req, res, next) => {
    const queue = await Queue.findOne({_id: req.params.queueId}).exec().catch(next);
    queue.remove(error => {
        if (error) {
            return res.send(new HTTPError.InternalServerError(`Queue could not be deleted.`));
        }
        return res.sendStatus(202);
    });
});

export default router;
