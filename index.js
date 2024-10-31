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
  original_url: {
    type: String, 
    required: true
  },
  short_url: {
    type: Number, 
    min: 1, 
    max: 1000,
    required: true
  }
}); 

let Url = mongoose.model('Url', urlSchema); 

//User body-parser to Parse POST Request
app.use(bodyParser.urlencoded({ extended: false})); 
let http_regex = /^(http:\/\/|https:\/\/)/;


//post route
app.post('/api/shorturl', async function(req, res){
  let url = req.body.url; //get url
  let urlData; 
  //check if url conaints 'https://'
  if(!http_regex.test(url)) //if not contain
  {
    return res.json({error: 'invalid url'}); 
  }

  //if url already exist 
  urlData = await Url.findOne({original_url: url}); 
  if(urlData){
    return res.json({original_url: urlData.original_url, short_url: urlData.short_url});
  }


  let randomNumber; 
  let validNumber = true; // Start as true, will turn false if a new number is generated
  do {
      randomNumber = Math.floor(Math.random() * 1000) + 1;
      urlData = await Url.findOne({ short_url: randomNumber });
      if (!urlData) {
          validNumber = false; // Number is valid, break the loop
          let newUrl = new Url({ original_url: url, short_url: randomNumber });
          try {
              await newUrl.save();
          } catch (error) {
              console.error('Error saving to database:', error);
              return res.status(500).json({ error: 'Error saving URL' });
          }
        
      }
  } while (validNumber);
  
    res.json({original_url: url, short_url: randomNumber});
});



//access short url 
app.get('/api/shorturl/:short_url?', async (req, res) => {
  let shortUrl = parseInt(req.params.short_url, 10);

  try {
    let urlData = await Url.findOne({ short_url: shortUrl });

    if (!urlData) {
      return res.status(404).send({ error: 'Short URL not found' });
    }

    res.redirect(urlData.original_url);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});



app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
