//implement
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const port =process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());
require('dotenv').config();

//mongodb
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://jalal:${process.env.DB_PASSWORD}@cluster0.8juwqfy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//mongodb collections
const userAccount=client.db("userAccount").collection("account");
const userPost=client.db("userAccount").collection("post");

app.get('/', (req, res) => {
  res.send('Hello World!');
});


try{

    //create user account
    //client site should post a object with username and password in request body
    app.post('/users',async (req, res) => {
        const userInfo=req.body;
        const {password}=userInfo;
        //encrypting password
        const salt =await bcrypt.genSaltSync(10);
        const hashedPassword =await bcrypt.hashSync(password, salt);
        if(!hashedPassword){
            return res.status(400).json({
                message: 'Account Creation Failed',
            });
        }
        userInfo.password=hashedPassword;
        const result = await userAccount.insertOne(userInfo);
        if(!result.insertedId){
            return res.status(400).json({
                message: 'Account Creation Failed',
            });
        }
        res.status(201).json({
            message: 'Account Created Successfully',
        });
    });

    //create a post
    //client site should post a object with data property in request body 
    app.post('/:username/post', async(req, res) =>{
        const username=req.params.username;
        const {data}=req.body;
        const post={
            username,
            data
        };
        const result = await userPost.insertOne(post);
        if(!result.insertedId){
            return res.status(400).json({
                message: 'Post Creation Failed',
            });
        }
        res.status(201).json({
            message: 'Post Created Successfully',
        });
        
    });

    //view all posts
    //get all posts from the property called posts form the object
    app.get('/posts', async(req, res) =>{
        const posts=await userPost.find({}).toArray();
        if(!posts){
            return res.status(400).json({
                message: 'No Post Found',
            });
        };
        res.status(200).json({
            posts
        });
    });

    //getting post of a specific user
    //get all posts from the property called posts form the object
    app.get('/:username/post',async(req,res)=>{
        const username=req.params.username;
        const posts=await userPost.find({username}).toArray();
        if(!posts){
            return res.status(400).json({
                message: 'No Post Found',
            });
        };
        res.status(200).json({
            posts
        });
    });

    
    //testing 
    // app.delete("/delete", async function(req, res) {
    //     const result=await userAccount.deleteMany({});
    //     res.send(result)
    // });



}catch(err){
    console.log(err);
}

app.listen(port, () => {
  console.log('Server listening on port '+port);
});
