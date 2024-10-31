require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
let mongoose = require('mongoose'); 

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

//URL shortener microservice 
//connect to mongodb
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

//create schema 
let urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
}); 

let Url = mongoose.model('Url', urlSchema); 

//User body-parser to Parse POST Request
app.use(bodyParser.urlencoded({ extended: false})); 
let http_regex = /^https:\/\//;

//async findOne url number 
async function findOneUsingOriginalUrlOrShortUrl(url) {
  try {
    let urlData;
    if(isNaN(url))
    {
       urlData = await Url.findOne({original_url: url}, {original_url: 1, short_url: 1});
    }
    else {
       urlData = await Url.findOne({short_url: url}, {original_url: 1, short_url: 1});
    }
    //if data exits 
    if(urlData){
      return urlData;
    } 

    return '';
  }
  catch (error){
    console.log("Error fetching data: ", error); 
  }
}


//post route
app.post('/api/shorturl', async function(req, res){
  let url = req.body.url; //get url
  //check if url conaints 'https://'
  if(!http_regex.test(url)) //if not contain
  {
    return res.json({error: 'invalid url'}); 
  }
  //check if url exists in the database
  const urlData =  await findOneUsingOriginalUrlOrShortUrl(url);
  console.log("urlData: ", urlData);

  if(urlData.original_url)
  {
    console.log('Exits: ', urlData.original_url);
  }
  else 
  {
    console.log('Doesn\'t exits');
    
    let randomNumberAlreadyExits =false;
    //get random number 
    do 
    {
      //generate random number
      let randNumber = Math.floor(Math.random()*1000) + 1;

      //check if random number already exists in the database
      let isPresent = await Url.findOne({short_url: `${randNumber}`}, {short_url: 1}); 

      //check if random number exits
      if(isPresent){
        randomNumberAlreadyExits = true;
      }else {
        randomNumberAlreadyExits = false;

        //add to database 
        let newUrl = new Url({original_url: `${url}`, short_url: randNumber}); 
        newUrl.save();
      }

    }while(randomNumberAlreadyExits)
    
  }

  let findData = await Url.findOne({original_url: `${url}`}, {_id: 0, original_url: 1, short_url: 1});

  res.json(findData);
});


//access short url 
app.get('/api/shorturl/:short_url', async (req, res) => {
  let urlData = await Url.findOne({short_url: req.params.short_url}, {original_url: 1}); 
  res.redirect(urlData.original_url);
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
