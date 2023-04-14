const express = require('express');
const cors = require('cors');
const { default: mongoose, Promise } = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User.js');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const fs = require('fs');
const mime = require('mime-types');
const Place = require('./models/Place.js')
const Booking = require('./models/Booking.js');
const multer = require('multer');

require('dotenv').config();// check what it does.. (commonly used method)
const app = express();
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'adsfafcxvcxbeqerwer';
const bucket = 'daksh-booking-app';

app.use(express.json()); // to convert json to javascript object
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cors({
    credentials: true,
    origin: 'http://127.0.0.1:5173', // what kind of app can communicate with this api
}));

async function uploadToS3(path, originalFilename, mimetype) {
    const client = new S3Client({
        region: 'ap-south-1',
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
    });
    const parts = originalFilename.split('.');
    const ext = parts[parts.length - 1];
    const newFilename = Date.now() + '.' + ext;

    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Body: fs.readFileSync(path),
        Key: newFilename,
        ContentType: mimetype,
        ACL: 'public-read',
    }))
    //console.log({ data });
    return `https://${bucket}.s3.amazonaws.com/${newFilename}`;
}

function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            resolve(userData);
        })
    });
}


app.get('/test', (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    res.json('test ok');
});
//Daksh0000
app.post('/register', async (req, res) => {
    //  console.log('x');

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({ // async function
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
        })
        res.json(userDoc);
    } catch (e) {
        res.status(422).json();// check it out
    }
});

app.post('/login', async (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    //console.log('x');
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email });

    if (userDoc) {
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign({ email: userDoc.email, id: userDoc._id }, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json(userDoc);
            })

        }
        else {
            res.status(422).json('pass not ok');
        }
    }
    else {
        res.status(422).json('not found');
    }
});

app.get('/profile', (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            const { name, email, _id } = await User.findById(userData.id);
            res.json({ name, email, _id });
        })
    } else {
        res.json(null);
    }
})

app.post('/logout', (req, res) => {
    res.cookie('token', '').json(true);
})

app.post('/upload-by-link', async (req, res) => {
    const { link } = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image({
        url: link,
        dest: '/tmp/' + newName,
    });
    const url = await uploadToS3('/tmp/' + newName, newName, mime.lookup('/tmp/' + newName));
    res.json(url);
})

const photosMiddleware = multer({ dest: '/tmp' });
app.post('/upload', photosMiddleware.array('photos', 100), async (req, res) => {
    const uploadedFiles = [];
    // console.log("server");
    //console.log(req.files);
    for (let i = 0; i < req.files.length; i++) {
        const { path, originalname, mimetype } = req.files[i];
        const url = await uploadToS3(path, originalname, mimetype);
        uploadedFiles.push(url);
    }
    res.json(uploadedFiles);
})

app.post('/places', (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const { token } = req.cookies;
    const {
        title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.create({
            owner: userData.id,
            title, address, photos: addedPhotos, description,
            perks, extraInfo, checkIn, checkOut, maxGuests, price
        })
        res.json(placeDoc);
    })

})

app.get('/user-places', (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const { token } = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        const { id } = userData;
        res.json(await Place.find({ owner: id }))
    })
})

app.get('/places/:id', async (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const { id } = req.params;
    res.json(await Place.findById(id));
})

app.put('/places', async (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const { token } = req.cookies;
    const { id,
        title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price
    } = req.body;

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.findById(id);
        if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
                title, address, photos: addedPhotos, description,
                perks, extraInfo, checkIn, checkOut, maxGuests, price
            })
            await placeDoc.save();
            res.json('ok');
        }
    })
})

app.get('/places', async (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    res.json(await Place.find());
})

app.post('/bookings', async (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const userData = await getUserDataFromReq(req);
    const {
        place, checkIn, checkOut, numberOfGuests, name, phone, price
    } = req.body;
    Booking.create({
        place, checkIn, checkOut, numberOfGuests, name, phone, price,
        user: userData.id,
    }).then((doc) => {

        res.json(doc)
    }).catch((err) => {
        throw err;
    })
})

app.get('/bookings', async (req, res) => {

    async function run() {
        await mongoose.connect(process.env.MONGO_URL);
    }
    run();
    const userData = await getUserDataFromReq(req);
    //console.log(await Booking.find({user:userData.id}));
    res.json(await Booking.find({ user: userData.id }).populate('place'));
})

app.listen(4000);