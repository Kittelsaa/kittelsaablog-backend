const express = require('express');
const User = require('./models/User');
const Blog = require('./models/Blog');
const app = express();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
app.use(cors({
    credentials: true,
    origin: [
        'http://localhost:3000'
        /* 'https://your-frontend-domain.com' */
    ],
}));

const mongoose = require('mongoose');
const secret = process.env.JWT_SECRET || 'qeoytvgjsi729ehw38he8&^jshgifv**kkart13r';
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://kittelsaany:jfpmNPJoztNB7IVQ@cluster0.a0rlg.mongodb.net/');
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));


// Registration endpoint
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    console.log({ requestData: { username, password } });
    try {
        const userDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt),
        });
        res.json(userDoc);
    } catch (e) {
        console.log(e)
        res.status(400).json(e)
    };
});

// LOGIN endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username });
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
        jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            });
        });
    } else {
        res.status(400).json('Wrong credentials');
    }
});

// profile endpoint
app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    jwt.verify(token, secret, (err, info) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        res.json(info);
    });
});


// logout endpoint
app.post('/logout', (req, res) => {
    res.cookie('token', '').json('ok');
});


// create new endpoint
app.post('/create', uploadMiddleware.single('file'), async (req, res) => {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
    /* from req grab thee title, summary,... */
    const { title, summary, content } = req.body;
    const blogDoc = await Blog.create({
        title,
        summary,
        content,
        cover: newPath,
    });
    res.json(blogDoc);
});

// GET BLOGS endpoint
app.get('/blog', async (req, res) => {
    res.json(await Blog.find());
});

// GET blog id info endpoint
app.get('/blog/:id', async (req, res) => {
    const { id } = req.params;
    blogDoc = await Blog.findById(id);
    res.json(blogDoc);
});

// create edit endpoint
app.put('/blog/:id', uploadMiddleware.single('file'), async (req, res) => {
    const { id } = req.params;
    const { title, summary, content } = req.body;
    let blogDoc;
    try {
        blogDoc = await Blog.findById(id);
        if (!blogDoc) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        blogDoc.title = title;
        blogDoc.summary = summary;
        blogDoc.content = content;

        if (req.file) {
            const { originalname, path } = req.file;
            const parts = originalname.split('.');
            const ext = parts[parts.length - 1];
            const newPath = path + '.' + ext;
            fs.renameSync(path, newPath);
            blogDoc.cover = newPath;
        }
        await blogDoc.save();
        res.json(blogDoc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update the blog' });
    }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
