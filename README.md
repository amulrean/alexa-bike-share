# Alexa Bike Share Skill

Use Alexa to quickly get Capital Bike Share Status. The skill was
developed using the Alexa Skills Kit SDK for Node.js

https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs



# Deployment

Follow the setup instructions at https://github.com/alexa/skill-sample-nodejs-howto

Once you have run through the setup instructions above you will need to
do the following after each development change.

To deploy the skill you need to run npm install to grab JS libraries
zip up the javascript components, upload file to AWS Lambda, edit the
Intent Schema and Sample Utterances on Amazons Developer Portal.


```
$ npm install
$ npm run zip
```

Upload dist/upload.zip to lambda

Paste Intent Schema and Sample Utterances into Alexa Developer console
https://developer.amazon.com/