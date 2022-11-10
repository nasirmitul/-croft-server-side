const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()


//middleware
app.use(cors())
app.use(express.json())


//database connection
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.4w35qx6.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader;

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
    })
}



async function run() {
    try {
        const serviceCollection = client.db('croft').collection('services');
        const reviewCollection = client.db('croft').collection('reviews');

        //creating api for token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log("user", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '2 days'
            })
            res.send({ token })
        })

        //creating api for services for home
        app.get('/home/services', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query).sort({ addedTime: -1 });
            const services = await cursor.limit(3).toArray();
            res.send(services);
        })

        //creating api for services for service page
        app.get('/services', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

        //creating api for single service
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        })

        //getting add service data
        app.post('/services', async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service)
            res.send(result);
        })

        //getting add review data
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review)
            res.send(result);
        })

        //creating api for reviews
        app.get('/reviews', async (req, res) => {
            let query = {}
            if (req.query.service_id) {
                query = {
                    service_id: req.query.service_id
                }
            }
            const cursor = reviewCollection.find(query).sort({ review_added_time: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        })


        //creating api for reviews(user-my reviews)
        app.get('/my-reviews', verifyJWT, async (req, res) => {


            // console.log("inside my reviews", req.headers.authorization);
            const decoded = req.decoded;
            console.log("inside my reviews", decoded.email);

            console.log("inside my reviews 2", req.query.user_email);

            if (decoded.email !== req.query.user_email) {
                res.status(403).send({ message: 'unauthorized access' })
            }

            let query = {}
            if (req.query.user_email) {
                query = {
                    user_email: req.query.user_email
                }
            }
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })


        //getting single review data
        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const review = await reviewCollection.findOne(query);
            res.send(review)
        })

        //update my reviews
        app.patch('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };

            const review = req.body;
            console.log(review);

            const updateReview = {
                $set: {
                    service_review: review.service_review
                }
            }

            const result = await reviewCollection.updateOne(query, updateReview);
            res.send(result);
        })

        //delete my reviews
        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reviewCollection.deleteOne(query);
            res.send(result)
        })

    }
    finally {

    }
}

run().catch(err => console.log(err))



app.get('/', (req, res) => {
    res.send("Croft server is running")
})


//run server
app.listen(port, () => {
    console.log('server is running on port number', port);
})