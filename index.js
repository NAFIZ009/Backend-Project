//implement
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const port =process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());
require('dotenv').config();
//verify jwt
function verifyToken(req, res, next) {
    const token = req.headers["x-access-token"];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_PK);
      req.userId = decoded.userId;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
//all route should have the jwt token for access
app.use(verifyToken());

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
        const result = await userAccount.insertOne({...userInfo,followers:[],following:[]});
        if(!result.insertedId){
            return res.status(400).json({
                message: 'Account Creation Failed',
            });
        }
        const token = jwt.sign({ userId:result.insertedId }, process.env.JWT_PK, { algorithm: 'RS256' });

        res.status(201).json({
            message: 'Account Created Successfully',
            token,
            user:userInfo.username
        });
    });

    //login
    //getting jwt token
    app.get('/login', async(req, res) => {
        const {username,password} = req.body;
        const findUser=await userAccount.findOne({username});
        if(!findUser){
            return res.status(400).json({
                message: 'Invalid Username'
            })
        };
        const isMatch = await bcrypt.compare(password, findUser.password);
        if(!isMatch){
            return res.status(400).json({
                message: 'Invalid Password'
            })
        };
        var token = jwt.sign({ userId:findUser._id }, process.env.JWT_PK, { algorithm: 'RS256' });
        res.status(200).json({
            token,
            user:findUser.username
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

    //following a user
    //:username is referred to the user who is followed
    //client site should give the current user's username in req.body
    app.post('/users/:username/follow',async(req,res)=>{
        //getting the users
        const currentUser = req.body.username;
        const followedUser = req.params.username;
        const currentUsersInfo = await userAccount.findOne({username:currentUser});
        const followedUserInfo = await userAccount.findOne({username:followedUser});

        //if the username and followed username are the same
        if(currentUser === followedUser){
            return res.status(400).json({
                message: 'You Can\'t Follow Yourself',
            }); 
        };

        //if the followed user is not available
        if(!followedUserInfo){
            return res.status(400).json({
                message: `${followedUser} Is Not Found`,
            }); 
        };

        //if the user is not available
        if(!currentUser){
            return res.status(400).json({
                message: `${currentUser} Is Not Found`,
            }); 
        };

        //if the user is already followed
        if(currentUsersInfo.following.includes(followedUser)){
            return res.status(400).json({
                message: `You Already Followed ${followedUser}`,
            });
        };

        //updating the current user's following list
        const updateFollowingInfo = {
            $push: { following:followedUser }
        };
        const updateFollowing =await userAccount.updateOne({username:currentUser},updateFollowingInfo);

        //updating the followed user's following list
        const updateFollowersInfo = {
            $push: { followers:currentUser }
        };
        const updateFollowers =await userAccount.updateOne({username:followedUser},updateFollowersInfo);

        if(!updateFollowing.modifiedCount===1&&updateFollowers.modifiedCount==1){
            return res.status(400).json({
                message: `Can\'t Follow The User`,
            });
        }
        return res.status(200).json({
            message: `${currentUser} Following ${followedUser}`,
        });
    });

    //getting followers of specified user
    //response will be a json object with followersCount(number of followers) and followers(name of followers)
    app.get('/users/:username/followers',async(req,res)=>{
        const username = req.params.username;
        const followers = await userAccount.findOne({username});
        if(!followers){
            return res.status(404).json({
                message:`Can\'t Find ${username}`
            });
        }else if(followers.followers.length<=0){
            return res.status(404).json({
                message:`Can\'t Find Any Followers For ${username}`
            });
        };
        res.status(200).json({
            followersCount:followers.followers.length,
            followers:followers.followers
        })
    });

    //getting following of specified user
    //response will be a json object with followingCount(number of following) and following(name of following user)
    app.get('/users/:username/following',async(req,res)=>{
        const username = req.params.username;
        const following = await userAccount.findOne({username});
        if(!following){
            return res.status(404).json({
                message:`Can\'t Find ${username}`
            });
        }else if(following.following.length<=0){
            return res.status(404).json({
                message:`Can\'t Find Any following For ${username}`
            });
        };
        res.status(200).json({
            followingCount:following.following.length,
            following:following.following
        })
    });

    //for unfollow a specified user
    //:username is referred to the user who will be unfollowed
    //client site should give the current user's username in req.body
    app.delete('/users/:username/follow',async(req,res)=>{
        //getting the users
        const currentUser = req.body.username;
        const followedUser = req.params.username;
        const currentUsersInfo = await userAccount.findOne({username:currentUser});
        const followedUserInfo = await userAccount.findOne({username:followedUser});

        //if the followed user is not available
        if(!followedUserInfo){
            return res.status(400).json({
                message: `${followedUser} Is Not Found`,
            }); 
        };

        //if the user is not available
        if(!currentUser){
            return res.status(400).json({
                message: `${currentUser} Is Not Found`,
            }); 
        };

        //if the user is not following
        if(!currentUsersInfo.following.includes(followedUser)){
            return res.status(400).json({
                message: `You Are Not Following ${followedUser}`,
            });
        };

        //updating the current user's following list by removing the following user from the list
        const updateFollowingInfo = {
            $pull: { following:followedUser }
        };
        const updateFollowing =await userAccount.updateOne({username:currentUser},updateFollowingInfo);

        //updating the followed user's following list by removing the follower user from the list
        const updateFollowersInfo = {
            $pull: { followers:currentUser }
        };
        const updateFollowers =await userAccount.updateOne({username:followedUser},updateFollowersInfo);

        if(!updateFollowing.modifiedCount===1&&updateFollowers.modifiedCount==1){
            return res.status(400).json({
                message: `Can\'t Unfollow The User`,
            });
        }
        return res.status(200).json({
            message: `${currentUser} Is SuccessFully UnFollow ${followedUser}`,
        });
    })


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
