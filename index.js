const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser")
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config(); 
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173','http://localhost:5000'],
    credentials:true
}));
app.use(express.json());
app.use(cookieParser());

// customize middleware 
const urlUsingCstmMiddleWare=async(req,res,next)=>{
    console.log('url from customize middleware', req.protocol, req.host, req.originalUrl);
    next();
}

// verify token through middleware 
const verifyToken = async(req,res,next) =>{
    const token = req.cookies?.token;
    console.log("token from verifyToken middleware :" , token);
    if(!token){
        return res.status(401).send({ Message : "unauthorized"})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET ,(err,decoded)=>{
        // if error 
        if(err){
            console.log(err);
            return res.status(401).send({ Message : "Not Valid" })
        }

        // if successfully decoded
        console.log(decoded);
        req.user = decoded;
        next();
    })
}

    
    const uri =
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qhz4s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    });

    async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const services = client.db('Car-doc-datas').collection('car-doc-services')
        const userOrderCollection = client.db('Car-doc-datas').collection('car-doc-order')

        // access token api's
        app.post('/jwt', async(req,res)=>{
            const accessTokenUser = req.body;
            // console.log(accessTokenUser);
            const accessToken = jwt.sign(accessTokenUser, process.env.ACCESS_TOKEN_SECRET , {expiresIn : '10h'})
            res.cookie('token', accessToken , {
                httpOnly: true,
                secure: false,
                sameSite: 'none',
                maxAge : 1000,
                // httpOnly: true,
                // secure: process.env.NODE_ENV === "production",
                // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
            })
            res.send('token received',)
        })

        // data api's
        app.get('/services' , async(req,res)=>{
            const result = await services.find().toArray();
            res.send(result)
        })
    
        // finding just one 
        app.get('/services/:id', async(req,res)=>{
            const id = req.params.id;
            const query ={_id : new ObjectId(id)}
            const options = {
                projection: { title: 1, price: 1 , img: 1 }
            }
            
            const result = await services.findOne(query,options)
            res.send(result)
        })


        
        // post
        app.post('/userOrders', async(req,res)=>{
            const orderInfo = req.body;
            // console.log(orderInfo);
            const result = await userOrderCollection.insertOne(orderInfo)
            res.send(result)
        })

        app.get('/userOrders',urlUsingCstmMiddleWare, verifyToken, async(req,res)=>{
            // console.log(req.query.email);
            // checking if the user trying to get only his data or not 
            if(req.query.email !== req.user.email){
                return res.status(403).send({Message : "Not Authorized to access the data"})
            }

            let query = {};
            if(req.query?.email){
                query = {email : req.query.email}
            }
            const token = req.cookies.token;
            console.log('from verifyToken middleware' , req.user);
            if (token) {
                console.log('Token from cookies:', token);
            } else {
                console.log('No token found in cookies');
            }
            
            const result = await userOrderCollection.find(query).toArray();
            res.send(result)
        })

        app.delete('/userOrders/:id', async(req,res)=>{
            const id = req.params.id;
            const query = { _id :new ObjectId(id)}
            const result = await userOrderCollection.deleteOne(query)
            res.send(result)
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
    }
    run().catch(console.dir);

    app.get("/", (req, res) => {
    res.send("car doctor server is running");
    });

    app.listen(port, () => {
    console.log(`server is running on port ${port}`);
    });
