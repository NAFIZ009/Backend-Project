const express = require('express');
const port =process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://jalal:<password>@cluster0.8juwqfy.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



app.get('/', (req, res) => {
  res.send('Hello World!');
});





app.listen(port, () => {
  console.log('Server listening on port '+port);
});
