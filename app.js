// Cory Todd 2017
'use strict';

process.env.DEBUG = 'actions-on-google:*';

let ActionsSdkAssistant = require('actions-on-google').ActionsSdkAssistant;
let express = require('express');
let bodyParser = require('body-parser');
const PubSub = require('@google-cloud/pubsub');
const projectId = 'ghlights-157102';

const pubsubClient = PubSub({
  projectId: projectId
});

const topicName = 'gh-light-event';

// Creates the new topic
pubsubClient.createTopic(topicName)
  .then((results) => {
    const topic = results[0];
    console.log(`Topic ${topic.name} created.`);
  });

let app = express();
app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.json({type: 'application/json'}));

app.post('/', function (request, response) {
  console.log('handle post');
  const assistant = new ActionsSdkAssistant({request: request, response: response});

  function mainIntent (assistant) {
    console.log('mainIntent');
    let inputPrompt = assistant.buildInputPrompt(true, '<speak>Hi! <break time="1"/> ' +
          '<s>I can adjust your lighting.</s>' +
          '<s>How and which lights do you want adjusted?</s></speak>',
          ['You want me to do what?', 'Maybe it was just the window. What did you want?', 'Lights, what?']);
    assistant.ask(inputPrompt);
  }

  function rawInput (assistant) {
    console.log('rawInput');
    if (assistant.getRawInput() === 'bye') {
      assistant.tell('Goodbye!');
    } else {

      let spoken = assistant.getRawInput();

      publishMessage(topicName, spoken);

      let inputPrompt = assistant.buildInputPrompt(true, '<speak>As you wish.<break time="1"/> Anything else?</speak>',
          ['You want me to do what?', 'Maybe it was just the window. What did you want?', 'Lights, what?']);
      assistant.ask(inputPrompt);
    }
  }

  let actionMap = new Map();
  actionMap.set(assistant.StandardIntents.MAIN, mainIntent);
  actionMap.set(assistant.StandardIntents.TEXT, rawInput);

  assistant.handleRequest(actionMap);
});

function publishMessage (topicName, data) {

  const pubsub = PubSub();


  const topic = pubsub.topic(topicName);


  return topic.publish(data)
    .then((results) => {
      const messageIds = results[0];

      console.log(`Message ${messageIds[0]} published.`);

      return messageIds;
    });
}

// Start the server
let server = app.listen(app.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
// [END app]
