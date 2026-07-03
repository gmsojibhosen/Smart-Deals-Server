import express, { json } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;


import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Check if the environment variable exists
if (!process.env.FIREBASE_SERVICE_KEY) {
  throw new Error("FIREBASE_SERVICE_KEY environment variable is missing.");
}

const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");

const serviceAccount = JSON.parse(decoded);

initializeApp({
  credential: cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(json())

//fireBase verify token middlewere 
const verifyFireBaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = await getAuth().verifyIdToken(token);

    console.log("after decoded", decoded);

    req.token_email = decoded.email;

    next();
  } catch (error) {
    console.log(error);
    return res.status(401).send({ message: "unauthorized access" });
  }
};

// fire base url
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@learing.xzfw8sa.mongodb.net/?retryWrites=true&w=majority&appName=learing`;




const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
app.get('/', (req, res) => {
    res.send('Smart server is running')
})

async function run() {
    try {
        await client.connect();

        const db = client.db('smart_db');
        const productsCollection = db.collection('products');
        const bidsCollection = db.collection('bids');
        const usersCollection = db.collection('users');

        // USERS APIs
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                res.send({ message: 'user already exits. do not need to insert again' })
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        })

        // PRODUCTS APIs
        app.get('/products', async (req, res) => {
            // const projectFields = { title: 1, price_min: 1, price_max: 1, image: 1 }
            // const cursor = productsCollection.find().sort({ price_min: -1 }).skip(2).limit(2).project(projectFields);

            console.log(req.query)
            const email = req.query.email;
            const query = {}
            if (email) {
                query.email = email;
            }

            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        });

        app.get('/latest-products', async (req, res) => {
            const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        app.post('/products', verifyFireBaseToken, async (req, res) => {
            console.log(req.headers)
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    name: updatedProduct.name,
                    price: updatedProduct.price
                }
            }

            const result = await productsCollection.updateOne(query, update)
            res.send(result)
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        // bids related apis
        app.get('/bids',verifyFireBaseToken, async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyer_email = email;
            }
            if(email !== req.token_email) {
                return res.status(403).send({message: 'forbidden'})
            }

            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })


        app.get('/products/bids/:productId', async (req, res) => {
            const productId = req.params.productId;
            const query = { product: productId }
            const cursor = bidsCollection.find(query).sort({ bid_price: -1 })
            const result = await cursor.toArray();
            res.send(result);
        })

        

        app.post('/bids', async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result);
        })

        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to my test MongoDB! ");




    }
    finally {

    }
}

run().catch(console.dir)
export default app;
// app.listen(port, () => {
//     console.log(`Smart server is running on port: ${port}`)
// })

// client.connect()
//     .then(() => {
//         app.listen(port, () => {
//             console.log(`Smart server is running now on port: ${port}`)
//         })

//     })
//     .catch(console.dir)