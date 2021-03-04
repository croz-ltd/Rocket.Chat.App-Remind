# Rocket.Chat App - Remind Me

Slack inspired application to remind people. 

Usage: /remind [me or @someone or #channel] [what] [when]

### Example

Triggering following reminder:

```
/remind me to go out and take long walk in 10 minutes
```

Post as user will send you acknowledge message that reminder is received and scheduled.
```
rocket.cat: 👍 I will remind you to "to go out and take long walk" in "10 seconds".
``` 

Or if you scheduled reminder for other person:

```
/remind @anotheruser to go out and take long walk in 10 minutes
```
```
rocket.cat: 👍 I will remind @anotheruser to "to go out and take long walk" in "15 seconds".
```

At the time reminder is triggered, you or targeted user will receive following message:
```
rocket.cat: You asked me to remind you to "to go out and take long walk".
```

### Time Formating

As Rocket.Chat implemented Scheduler API is using [agenda.js](https://github.com/agenda/agenda), 
time formatting rules for reminders are defined by agenda.js.

### Configuration

On application configuration it is possible to change following settings:

- **Post as** <br />
  Choose the username that this integration will post as. The user must already exist.<br />
  Default: `rocket.cat`<br />
  Required: `true`
  
- **Alias** <br />
  Choose the alias that will appear before the username in messages.<br />
  Default: `\<undefined>`<br />
  Required: `false`

## TODO

- [ ] Implementation of recurring reminders
