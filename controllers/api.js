const bluebird = require('bluebird');
const request = bluebird.promisifyAll(require('request'), {
    multiArgs: true
});
const cheerio = require('cheerio');
const graph = require('fbgraph');
const LastFmNode = require('lastfm').LastFmNode;
const tumblr = require('tumblr.js');
const GitHub = require('github');
const Twit = require('twit');
const stripe = require('stripe')(process.env.STRIPE_SKEY);
const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const Linkedin = require('node-linkedin')(process.env.LINKEDIN_ID, process.env.LINKEDIN_SECRET, process.env.LINKEDIN_CALLBACK_URL);
const clockwork = require('clockwork')({
    key: process.env.CLOCKWORK_KEY
});

const paypal = require('paypal-rest-sdk');
const lob = require('lob')(process.env.LOB_KEY);
const ig = bluebird.promisifyAll(require('instagram-node').instagram());
const foursquare = require('node-foursquare')({
    secrets: {
        clientId: process.env.FOURSQUARE_ID,
        clientSecret: process.env.FOURSQUARE_SECRET,
        redirectUrl: process.env.FOURSQUARE_REDIRECT_URL
    }
});
const passport = require('passport');

const User = require('../models/User');

foursquare.Venues = bluebird.promisifyAll(foursquare.Venues);
foursquare.Users = bluebird.promisifyAll(foursquare.Users);

/**
 * GET /api
 * List of API examples.
 */
exports.getApi = (req, res) => {
    res.render('api/index', {
        title: 'API Examples'
    });
};

/**
 * GET /api/foursquare
 * Foursquare API example.
 */
exports.getFoursquare = (req, res, next) => {
    const token = req.user.tokens.find(token => token.kind === 'foursquare');
    Promise.all([
            foursquare.Venues.getTrendingAsync('40.7222756', '-74.0022724', {
                limit: 50
            }, token.accessToken),
            foursquare.Venues.getVenueAsync('49da74aef964a5208b5e1fe3', token.accessToken),
            foursquare.Users.getCheckinsAsync('self', null, token.accessToken)
        ])
        .then(([trendingVenues, venueDetail, userCheckins]) => {
            res.render('api/foursquare', {
                title: 'Foursquare API',
                trendingVenues,
                venueDetail,
                userCheckins
            });
        })
        .catch(next);
};

/**
 * GET /api/tumblr
 * Tumblr API example.
 */
exports.getTumblr = (req, res, next) => {
    const token = req.user.tokens.find(token => token.kind === 'tumblr');
    const client = tumblr.createClient({
        consumer_key: process.env.TUMBLR_KEY,
        consumer_secret: process.env.TUMBLR_SECRET,
        token: token.accessToken,
        token_secret: token.tokenSecret
    });
    client.posts('mmosdotcom.tumblr.com', {
        type: 'photo'
    }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.render('api/tumblr', {
            title: 'Tumblr API',
            blog: data.blog,
            photoset: data.posts[0].photos
        });
    });
};

/**
 * GET /api/facebook
 * Facebook API example.
 */
exports.getFacebook = (req, res, next) => {
    const token = req.user.tokens.find(token => token.kind === 'facebook');
    graph.setAccessToken(token.accessToken);
    graph.get(`${req.user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err, results) => {
        if (err) {
            return next(err);
        }
        res.render('api/facebook', {
            title: 'Facebook API',
            profile: results
        });
    });
};

/**
 * GET /api/scraping
 * Web scraping example using Cheerio library.
 */
exports.getScraping = (req, res, next) => {
    request.get('https://news.ycombinator.com/', (err, request, body) => {
        if (err) {
            return next(err);
        }
        const $ = cheerio.load(body);
        const links = [];
        $('.title a[href^="http"], a[href^="https"]').each((index, element) => {
            links.push($(element));
        });
        res.render('api/scraping', {
            title: 'Web Scraping',
            links
        });
    });
};

/**
 * GET /api/github
 * GitHub API Example.
 */
exports.getGithub = (req, res, next) => {
    const github = new GitHub();
    github.repos.get({
        owner: 'sahat',
        repo: 'hackathon-starter'
    }, (err, repo) => {
        if (err) {
            return next(err);
        }
        res.render('api/github', {
            title: 'GitHub API',
            repo
        });
    });
};

/**
 * GET /api/aviary
 * Aviary image processing example.
 */
exports.getAviary = (req, res) => {
    res.render('api/aviary', {
        title: 'Aviary API'
    });
};

/**
 * GET /api/nyt
 * New York Times API example.
 */
exports.getNewYorkTimes = (req, res, next) => {
    const query = {
        'list-name': 'young-adult',
        'api-key': process.env.NYT_KEY
    };
    request.get({
        url: 'http://api.nytimes.com/svc/books/v2/lists',
        qs: query
    }, (err, request, body) => {
        if (err) {
            return next(err);
        }
        if (request.statusCode === 403) {
            return next(new Error('Invalid New York Times API Key'));
        }
        const books = JSON.parse(body).results;
        res.render('api/nyt', {
            title: 'New York Times API',
            books
        });
    });
};

/**
 * GET /api/lastfm
 * Last.fm API example.
 */
exports.getLastfm = (req, res, next) => {
    const lastfm = new LastFmNode({
        api_key: process.env.LASTFM_KEY,
        secret: process.env.LASTFM_SECRET
    });
    const artistInfo = () =>
        new Promise((resolve, reject) => {
            lastfm.request('artist.getInfo', {
                artist: 'Roniit',
                handlers: {
                    success: resolve,
                    error: reject
                }
            });
        });
    const artistTopTracks = () =>
        new Promise((resolve, reject) => {
            lastfm.request('artist.getTopTracks', {
                artist: 'Roniit',
                handlers: {
                    success: (data) => {
                        resolve(data.toptracks.track.slice(0, 10));
                    },
                    error: reject
                }
            });
        });
    const artistTopAlbums = () =>
        new Promise((resolve, reject) => {
            lastfm.request('artist.getTopAlbums', {
                artist: 'Roniit',
                handlers: {
                    success: (data) => {
                        resolve(data.topalbums.album.slice(0, 3));
                    },
                    error: reject
                }
            });
        });
    Promise.all([
            artistInfo(),
            artistTopTracks(),
            artistTopAlbums()
        ])
        .then(([artistInfo, artistTopAlbums, artistTopTracks]) => {
            const artist = {
                name: artistInfo.artist.name,
                image: artistInfo.artist.image.slice(-1)[0]['#text'],
                tags: artistInfo.artist.tags.tag,
                bio: artistInfo.artist.bio.summary,
                stats: artistInfo.artist.stats,
                similar: artistInfo.artist.similar.artist,
                topAlbums: artistTopAlbums,
                topTracks: artistTopTracks
            };
            res.render('api/lastfm', {
                title: 'Last.fm API',
                artist
            });
        })
        .catch(next);
};

/**
 * GET /api/twitter
 * Twitter API example.
 */
exports.getTwitter = (req, res, next) => {
    const token = req.user.tokens.find(token => token.kind === 'twitter');
    const T = new Twit({
        consumer_key: process.env.TWITTER_KEY,
        consumer_secret: process.env.TWITTER_SECRET,
        access_token: token.accessToken,
        access_token_secret: token.tokenSecret
    });
    T.get('search/tweets', {
        q: 'nodejs since:2013-01-01',
        geocode: '40.71448,-74.00598,5mi',
        count: 10
    }, (err, reply) => {
        if (err) {
            return next(err);
        }
        res.render('api/twitter', {
            title: 'Twitter API',
            tweets: reply.statuses
        });
    });
};

/**
 * GET /api/twitter
 * Twitter API example.
 */
var count = 0;
exports.followTwitter = (req, res, next) => {
    req.assert('follow', 'search cannot be empty').notEmpty();
    var follows = ["%23cats","%23kitties","%23cute","%40PDATA_Token", "%40xyoraclenetwork", "%40mybitnation", "%40Essentia_One",
        "%40FriendUPCloud",
        "%40JoyToken",
        "%40Skyllz_Platform", "%40Current_CRNC", "%40MomentumToken",
        "%40equi_capital", 
        "%40cryptocarz", 
        "%40GlobalReit01", 
        "%40SMARC_ICO", 
        "%40explorequadrant", 
        "%40ZeroCarbonPrjct", 
        "%40orvium", 
        "%40yumeriumtoken", 
        "%40CountinghouseFd", 
        "%40FlipNpik", 
        "%40Blockshipping"
    ];
    const errors = req.validationErrors();

            if (errors) {
                req.flash('errors', errors);
                return res.redirect('/api/twitter');
            }
            const token = req.user.tokens.find(token => token.kind === 'twitter');
            const T = new Twit({
                consumer_key: process.env.TWITTER_KEY,
                consumer_secret: process.env.TWITTER_SECRET,
                access_token: token.accessToken,
                access_token_secret: token.tokenSecret
            });
    const user = new User();
    console.log('followers');
    console.log(req.user.followers);
    console.log(req.user.followers.length);
    console.log('following');
    console.log(req.user.following);
    console.log(req.user.following.length);
    
    for (var follow in follows) {

        setTimeout(function lala() {
            
            T.get('friends/ids', {
                user_id: req.user.screen_name,
                count: 5000,
                stringify_ids: true
            }, (err, reply) => {    
                if (err) {
                    console.log(err);
                }
                var list = [];
                for (var user in reply.ids) {
                    var u = reply.ids[user];
                    list.push(u);
                }
                var newList = req.user.following;
                for (var id in list){
                    if (newList.indexOf(list[id]) == -1){
                        newList.push(list[id]);

                    }
                }
                User.findById(req.user.id, (err, user) => {
                  if (err) { console.log(err); }
                  user.following = newList;
                  user.save((err) => {
                    if (err) { console.log(err); }
                    
                  });
                });
                T.get('followers/list', {
                user_id: req.user.screen_name,
                count: 200,
            }, (err, reply) => { 
                console.log(err);
                var followers = [];
                for (var user in reply.users){
                    var id = reply.users[user].id;
                    followers.push(id);
                }
                var oldList = req.user.followers;
                for (var follower in followers){
                    if (oldList.indexOf(followers[follower]) == -1 && (typeof followers[follow] == String)){
                        oldList.push(followers[follower]);
                    }

                }
                User.findById(req.user.id, (err, user) => {
                  if (err) { console.log(err); }
                  user.followers = oldList;
                  user.save((err) => {
                    if (err) { console.log(err); }
                    
                  });
                });
            
            }); 
			var geoid = "";
			T.get('geo/search', {
				query: 'New york'
			}, (err, reply) => {
				for (var status in reply.result.places) {
					geoid = reply.result.places[status].id;
				}
				console.log('geoid: ' + geoid);
			var query = [];
			T.get('trends/place', {
				id: geoid
			}, (err, reply) => {
				for (var status in reply.trends) {
					console.log(reply.trends[status].query);
					query.push(reply.trends[status].query);
				}
				for (var q in query){
					follows.push(query[q]);
				}
				console.log(follows);	
                T.get('search/tweets', {
                    q: follows[Math.floor(Math.random()*follows.length)] + " -filter:retweets AND -filter:replies",
                    result_type: 'recent',
                    count: 15
                }, (err, reply) => {
                    if (err) {
                        return next(err);
                    }

                    for (var status in reply.statuses) {
                        var user = reply.statuses[status].user;
                        var screen_name = user.screen_name;

                        var count = 0;
                        T.post('friendships/create', {
                            screen_name: screen_name,
                            follow: true
                        }, (err2, reply2) => {
                            if (err2) {
                                
                                    //console.log(err2);
                            }
                            console.log(reply2.name);

                        });
                        if (reply.statuses[status].id) {


                            T.post('favorites/create', {
                                id: reply.statuses[status].id_str
                            }, (err2, reply2) => {
                                if (err2) {
                                   // console.log(err2);
                                }
                              //  console.log(reply2);

                            });



                            T.post('statuses/retweet/' + reply.statuses[status].id_str, {
                                id: reply.statuses[status].id
                            }, (err2, reply2) => {
                                if (err2) {
                                  //  console.log(err2);
                                }

                            });
                        }

                    }
                    count++;
                    res.render('api/twitter', {
                        title: 'Twitter API',
                        tweets: reply.statuses

                    });
                });
			});
			});
            }); 
        }, (60 * 1100 * 15 * follow));
    }/*
    var following = req.user.following;
            var followers = req.user.followers;
            var unfollow = [];
            for (var follow in following){
                 if (followers.indexOf(following[follow]) == -1 && !isNaN(parseFloat(following[follow]))){
                    
                    unfollow.push(parseFloat(following[follow]));
                 }   

            }
            console.log('unfollow');
            console.log(unfollow);
            for (var i = unfollow.length-11; i <= unfollow.length; i++){
                var ran = Math.floor((Math.random() * unfollow.length) + 0); 
                    T.post('friendships/destroy', {
                        user_id: unfollow[ran]
                    }, (err, reply) => {    

                         if (typeof reply.name == 'undefined'){
                            console.log(reply);
                         }
                    });

            }
    setInterval(function lala(){
            var following = req.user.following;
            var followers = req.user.followers;
            var unfollow = [];
            for (var follow in following){
                 if (followers.indexOf(following[follow]) == -1 && !isNaN(parseFloat(following[follow]))){
                    unfollow.push(parseFloat(following[follow]));
                 }   

            }
            console.log('unfollow');
            console.log(unfollow);
            for (var i = 0; i <= 11; i++){
                    var ran = Math.floor((Math.random() * unfollow.length) + 0); 

                    T.post('friendships/destroy', {
                        user_id: unfollow[ran]
                    }, (err, reply) => {    

                         if (typeof reply.name == 'undefined'){
                          //  console.log(reply);
                         }
                    });

            }
        }
            , 2 * 60 * 1000 * 60);
			*/
};

/**
 * POST /api/twitter
 * Post a tweet.
 */
exports.postTwitter = (req, res, next) => {
    req.assert('tweet', 'Tweet cannot be empty').notEmpty();

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/api/twitter');
    }

    const token = req.user.tokens.find(token => token.kind === 'twitter');
    const T = new Twit({
        consumer_key: process.env.TWITTER_KEY,
        consumer_secret: process.env.TWITTER_SECRET,
        access_token: token.accessToken,
        access_token_secret: token.tokenSecret
    });
    T.post('statuses/update', {
        status: req.body.tweet
    }, (err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', {
            msg: 'Your tweet has been posted.'
        });
        res.redirect('/api/twitter');
    });
};

/**
 * GET /api/steam
 * Steam API example.
 */
exports.getSteam = (req, res, next) => {
    const steamId = '76561197982488301';
    const params = {
        l: 'english',
        steamid: steamId,
        key: process.env.STEAM_KEY
    };
    const playerAchievements = () => {
        params.appid = '49520';
        return request.getAsync({
                url: 'http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/',
                qs: params,
                json: true
            })
            .then(([request, body]) => {
                if (request.statusCode === 401) {
                    throw new Error('Invalid Steam API Key');
                }
                return body;
            });
    };
    const playerSummaries = () => {
        params.steamids = steamId;
        return request.getAsync({
                url: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
                qs: params,
                json: true
            })
            .then(([request, body]) => {
                if (request.statusCode === 401) {
                    throw Error('Missing or Invalid Steam API Key');
                }
                return body;
            });
    };
    const ownedGames = () => {
        params.include_appinfo = 1;
        params.include_played_free_games = 1;
        return request.getAsync({
                url: 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/',
                qs: params,
                json: true
            })
            .then(([request, body]) => {
                if (request.statusCode === 401) {
                    throw new Error('Missing or Invalid Steam API Key');
                }
                return body;
            });
    };
    Promise.all([
            playerAchievements(),
            playerSummaries(),
            ownedGames()
        ])
        .then(([playerAchievements, playerSummaries, ownedGames]) => {
            res.render('api/steam', {
                title: 'Steam Web API',
                ownedGames: ownedGames.response.games,
                playerAchievemments: playerAchievements.playerstats,
                playerSummary: playerSummaries.response.players[0]
            });
        })
        .catch(next);
};

/**
 * GET /api/stripe
 * Stripe API example.
 */
exports.getStripe = (req, res) => {
    res.render('api/stripe', {
        title: 'Stripe API',
        publishableKey: process.env.STRIPE_PKEY
    });
};

/**
 * POST /api/stripe
 * Make a payment.
 */
exports.postStripe = (req, res) => {
    const stripeToken = req.body.stripeToken;
    const stripeEmail = req.body.stripeEmail;
    stripe.charges.create({
        amount: 395,
        currency: 'usd',
        source: stripeToken,
        description: stripeEmail
    }, (err) => {
        if (err && err.type === 'StripeCardError') {
            req.flash('errors', {
                msg: 'Your card has been declined.'
            });
            return res.redirect('/api/stripe');
        }
        req.flash('success', {
            msg: 'Your card has been successfully charged.'
        });
        res.redirect('/api/stripe');
    });
};

/**
 * GET /api/twilio
 * Twilio API example.
 */
exports.getTwilio = (req, res) => {
    res.render('api/twilio', {
        title: 'Twilio API'
    });
};

/**
 * POST /api/twilio
 * Send a text message using Twilio.
 */
exports.postTwilio = (req, res, next) => {
    req.assert('number', 'Phone number is required.').notEmpty();
    req.assert('message', 'Message cannot be blank.').notEmpty();

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/api/twilio');
    }

    const message = {
        to: req.body.number,
        from: '+13472235148',
        body: req.body.message
    };
    twilio.sendMessage(message, (err, responseData) => {
        if (err) {
            return next(err.message);
        }
        req.flash('success', {
            msg: `Text sent to ${responseData.to}.`
        });
        res.redirect('/api/twilio');
    });
};

/**
 * GET /api/clockwork
 * Clockwork SMS API example.
 */
exports.getClockwork = (req, res) => {
    res.render('api/clockwork', {
        title: 'Clockwork SMS API'
    });
};

/**
 * POST /api/clockwork
 * Send a text message using Clockwork SMS
 */
exports.postClockwork = (req, res, next) => {
    const message = {
        To: req.body.telephone,
        From: 'Hackathon',
        Content: 'Hello from the Hackathon Starter'
    };
    clockwork.sendSms(message, (err, responseData) => {
        if (err) {
            return next(err.errDesc);
        }
        req.flash('success', {
            msg: `Text sent to ${responseData.responses[0].to}`
        });
        res.redirect('/api/clockwork');
    });
};

/**
 * GET /api/linkedin
 * LinkedIn API example.
 */
exports.getLinkedin = (req, res, next) => {
    const token = req.user.tokens.find(token => token.kind === 'linkedin');
    const linkedin = Linkedin.init(token.accessToken);
    linkedin.people.me((err, $in) => {
        if (err) {
            return next(err);
        }
        res.render('api/linkedin', {
            title: 'LinkedIn API',
            profile: $in
        });
    });
};

/**
 * GET /api/instagram
 * Instagram API example.
 */
exports.getInstagram = (req, res, next) => {
    const token = req.user.tokens.find(token => token.kind === 'instagram');
    ig.use({
        client_id: process.env.INSTAGRAM_ID,
        client_secret: process.env.INSTAGRAM_SECRET
    });
    ig.use({
        access_token: token.accessToken
    });
    Promise.all([
            ig.user_searchAsync('richellemead'),
            ig.userAsync('175948269'),
            ig.media_popularAsync(),
            ig.user_self_media_recentAsync()
        ])
        .then(([searchByUsername, searchByUserId, popularImages, myRecentMedia]) => {
            res.render('api/instagram', {
                title: 'Instagram API',
                usernames: searchByUsername,
                userById: searchByUserId,
                popularImages,
                myRecentMedia
            });
        })
        .catch(next);
};

/**
 * GET /api/paypal
 * PayPal SDK example.
 */
exports.getPayPal = (req, res, next) => {
    paypal.configure({
        mode: 'sandbox',
        client_id: process.env.PAYPAL_ID,
        client_secret: process.env.PAYPAL_SECRET
    });

    const paymentDetails = {
        intent: 'sale',
        payer: {
            payment_method: 'paypal'
        },
        redirect_urls: {
            return_url: process.env.PAYPAL_RETURN_URL,
            cancel_url: process.env.PAYPAL_CANCEL_URL
        },
        transactions: [{
            description: 'Hackathon Starter',
            amount: {
                currency: 'USD',
                total: '1.99'
            }
        }]
    };

    paypal.payment.create(paymentDetails, (err, payment) => {
        if (err) {
            return next(err);
        }
        req.session.paymentId = payment.id;
        const links = payment.links;
        for (let i = 0; i < links.length; i++) {
            if (links[i].rel === 'approval_url') {
                res.render('api/paypal', {
                    approvalUrl: links[i].href
                });
            }
        }
    });
};

/**
 * GET /api/paypal/success
 * PayPal SDK example.
 */
exports.getPayPalSuccess = (req, res) => {
    const paymentId = req.session.paymentId;
    const paymentDetails = {
        payer_id: req.query.PayerID
    };
    paypal.payment.execute(paymentId, paymentDetails, (err) => {
        res.render('api/paypal', {
            result: true,
            success: !err
        });
    });
};

/**
 * GET /api/paypal/cancel
 * PayPal SDK example.
 */
exports.getPayPalCancel = (req, res) => {
    req.session.paymentId = null;
    res.render('api/paypal', {
        result: true,
        canceled: true
    });
};

/**
 * GET /api/lob
 * Lob API example.
 */
exports.getLob = (req, res, next) => {
    lob.routes.list({
        zip_codes: ['10007']
    }, (err, routes) => {
        if (err) {
            return next(err);
        }
        res.render('api/lob', {
            title: 'Lob API',
            routes: routes.data[0].routes
        });
    });
};

/**
 * GET /api/upload
 * File Upload API example.
 */

exports.getFileUpload = (req, res) => {
    res.render('api/upload', {
        title: 'File Upload'
    });
};

exports.postFileUpload = (req, res) => {
    req.flash('success', {
        msg: 'File was uploaded successfully.'
    });
    res.redirect('/api/upload');
};

/**
 * GET /api/pinterest
 * Pinterest API example.
 */
exports.getPinterest = (req, res, next) => {
    const token = req.user.tokens.find(token => token.kind === 'pinterest');
    request.get({
        url: 'https://api.pinterest.com/v1/me/boards/',
        qs: {
            access_token: token.accessToken
        },
        json: true
    }, (err, request, body) => {
        if (err) {
            return next(err);
        }
        res.render('api/pinterest', {
            title: 'Pinterest API',
            boards: body.data
        });
    });
};

/**
 * POST /api/pinterest
 * Create a pin.
 */
exports.postPinterest = (req, res, next) => {
    req.assert('board', 'Board is required.').notEmpty();
    req.assert('note', 'Note cannot be blank.').notEmpty();
    req.assert('image_url', 'Image URL cannot be blank.').notEmpty();

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/api/pinterest');
    }

    const token = req.user.tokens.find(token => token.kind === 'pinterest');
    const formData = {
        board: req.body.board,
        note: req.body.note,
        link: req.body.link,
        image_url: req.body.image_url
    };

    request.post('https://api.pinterest.com/v1/pins/', {
        qs: {
            access_token: token.accessToken
        },
        form: formData
    }, (err, request, body) => {
        if (err) {
            return next(err);
        }
        if (request.statusCode !== 201) {
            req.flash('errors', {
                msg: JSON.parse(body).message
            });
            return res.redirect('/api/pinterest');
        }
        req.flash('success', {
            msg: 'Pin created'
        });
        res.redirect('/api/pinterest');
    });
};

exports.getGoogleMaps = (req, res) => {
    res.render('api/google-maps', {
        title: 'Google Maps API'
    });
};