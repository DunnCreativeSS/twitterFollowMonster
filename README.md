## twitterFollowMonster

## Requirements

Node, npm

## Original Code

https://github.com/sahat/hackathon-starter

## Purpose

To extend social capability with a multi-OAuth login boilerplate

## Capabilities

So far:

* Twitter login
* Twitter auto-follow, auto-retweeet, auto-favorite, auto-followback
* Twitter list of followers in order by how many followers they have, along with count

To do:

* Same stuff for Instagram

## Setup

```
git clone https://github.com/DunnCreativeSS/twitterFollowMonster
cd twitterFollowMonster
npm i
```

Copy .env.example and save it as .env

Replace the Twitter vars with yours from apps.twitter.com

On apps.twitter.com, set callback URL: http://127.0.0.1:8080/auth/twitter/callback

```
npm start
```
