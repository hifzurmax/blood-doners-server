const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

//Middlewares
app.use(cors());
app.use(express.json())


app.get('/', (req, res) => {
    res.send('Server is Running');
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tdu7beu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const userCollection = client.db("Blood-Doners").collection("users")
        const requestCollection = client.db("Blood-Doners").collection("requests")

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middlewares 
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }


        // Users Related API

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })

        app.patch('/make-admin/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    userRole: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        app.patch('/make-volunteer/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    userRole: 'volunteer'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })


        app.patch('/block/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'blocked'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })


        app.patch('/unblock/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'active'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        app.get('/all-users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users', async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        // Blood Request API 
        app.post('/request', async (req, res) => {
            const request = req.body;
            const result = await requestCollection.insertOne(request);
            res.send(result);
        })

        //Getting all requests 
        app.get('/all-requests', verifyToken, async (req, res) => {
            const result = await requestCollection.find().toArray();
            res.send(result)
        })

        app.get('/pending-requests', async (req, res) => {
            const query = {status: "pending"}
            const result = await requestCollection.find(query).toArray();
            res.send(result)
        })

        //Getting the requests by user
        app.get('/donor-requests', async (req, res) => {
            let query = {};
            if (req?.query?.email) {
                query = { requesterEmail: req.query.email };
            }
            const result = await requestCollection.find(query).toArray();
            res.send(result)
        })

        //Inprogress request status
        app.patch('/inprogress/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = req.body;

            const updateRequest = {
                $set: {
                    donorEmail: updatedDoc.donorEmail,
                    donorName: updatedDoc.donorName,
                    status: updatedDoc.status
                }
            }
            const result = await requestCollection.updateOne(filter, updateRequest, options);
            res.send(result)
        })


        app.get('/all-requests/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await requestCollection.findOne(query);
            res.send(result);
        })

        // Request status done
        app.patch('/done/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'Done'
                }
            }
            const result = await requestCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        // Request status Canceled
        app.patch('/cancel/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'Canceled'
                }
            }
            const result = await requestCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        // Request Delete
        app.delete('/requets/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await requestCollection.deleteOne(query);
            res.send(result);
        })

        // Request Update
        app.patch('/update-request/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateRequest = req.body;

            const request = {
                $set: {
                    requesterEmail: updateRequest.requesterEmail,
                    requesterName: updateRequest.requesterName,
                    recipientName: updateRequest.recipientName,
                    bloodGroup: updateRequest.bloodGroup,
                    district: updateRequest.district,
                    upazila: updateRequest.upazila,
                    hospitalName: updateRequest.hospitalName,
                    fullAddress: updateRequest.fullAddress,
                    donationDate: updateRequest.donationDate,
                    donationTime: updateRequest.donationTime,
                    requestMessage: updateRequest.requestMessage
                }
            }
            const result = await requestCollection.updateOne(filter, request);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})