import express from 'express';
import Blog from '../models/blogModel.js';
import expressAsyncHandler from 'express-async-handler';
import { isAuth, isAdmin } from '../utils.js';
import mongoose from 'mongoose';

const blogRouter = express.Router();


const validateObjectId = (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: `Invalid Blog ID: ${id}` });
    }
    next();
};


blogRouter.get(
    '/',
    expressAsyncHandler(async (req, res) => {
        const pageSize = 10;
    const page = Number(req.query.page) || 1;
      const blogs = await Blog.find({})
      .skip(pageSize * (page - 1))
      .limit(pageSize);  
      const countBlogs = await Blog.countDocuments();
    const pages = Math.ceil(countBlogs / pageSize);
    res.send({ blogs, page, pages }); 

  })
);


blogRouter.get(
    '/:id',
    validateObjectId,
    expressAsyncHandler(async (req, res) => {
        try {
            const blog = await Blog.findById(req.params.id);
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }
            res.json(blog);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })
);


blogRouter.post(
    '/',
    isAuth,
    isAdmin,
    expressAsyncHandler(async (req, res) => {
        const newBlog = new Blog({
            title: 'sample title ' + Date.now(),
            slug: 'sample-slug-' + Date.now(),
            content: 'sample content',
            shortDescription: 'sample description',
            image: '/images/p1.jpg',
        });
        const blog = await newBlog.save();
        res.send({ message: 'Blog Created', blog });
    })
);


blogRouter.put(
    '/:id',
    isAuth,
    isAdmin,
    validateObjectId,
    expressAsyncHandler(async (req, res) => {
        const blog = await Blog.findById(req.params.id);
        if (blog) {
            blog.title = req.body.title;
            blog.slug = req.body.slug;
            blog.content = req.body.content;
            blog.shortDescription = req.body.shortDescription;
            blog.image = req.body.image;
            await blog.save();
            res.send({ message: 'Blog Updated' });
        } else {
            res.status(404).send({ message: 'Blog Not Found' });
        }
    })
);


blogRouter.delete(
    '/:id',
    isAuth,
    isAdmin,
    validateObjectId,
    expressAsyncHandler(async (req, res) => {
        const blog = await Blog.findById(req.params.id);
        if (blog) {
            await blog.deleteOne();
            res.send({ message: 'Blog Deleted' });
        } else {
            res.status(404).send({ message: 'Blog Not Found' });
        }
    })
);


blogRouter.get('/admin/blogs-list', async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const limit = 10;
    const skip = (page - 1) * limit; 

    try {
        const totalBlogs = await Blog.countDocuments(); 
        const blogs = await Blog.find().skip(skip).limit(limit); 

        res.json({
            totalBlogs,
            blogs,
            currentPage: page,
            totalPages: Math.ceil(totalBlogs / limit), 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

export default blogRouter;
