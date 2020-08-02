const express = require('express');
const app = express();
const port = process.env.PORT || 8888;
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const base_url = "https://api.twitch.tv/kraken/";
const db = require('./models');
const moment = require('moment');
const { Sequelize, sequelize } = require('./models');
const { Op } = require('sequelize');

app.use(cors());
// app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

let config = {
    headers: {
        "Accept": 'application/vnd.twitchtv.v5+json',
        "Client-ID": 'kimne78kx3ncx6brgo4mv6wki5h1ko'
    }
}

app.get('/channels/:name', (req, res) => {
    let username = req.params.name;
    db.Cache.findAll({
        attributes: ['channel', 'followers'],
        where: {
            key: username,
            timestamp: {
                [Op.gte]: moment().subtract(5, 'minutes').toDate()
            }
        }
    }).then((cache) => {
        if(cache.length) {
            console.log("FOUND IN CACHE");
            res.json({
                followers: cache[0].dataValues.followers,
                channel: cache[0].dataValues.channel
            });
        }
        else {
            console.log("CREATING NEW ENTRY");
            axios.get(`${base_url}users?login=${username}`, config)
            .then(user_res => {
                let user = user_res.data.users[0];
                if (user) {
                    return axios.get(`${base_url}channels/${user._id}/follows`, config)
                    .then(follow_res => {
                        let followers = follow_res.data._total
                        let channel =  user.display_name;
                        db.Cache.create({
                            key: username,
                            channel: channel,
                            followers: followers,
                            timestamp: Sequelize.literal('CURRENT_TIMESTAMP')
                        });
                        res.json({
                            followers: followers,
                            channel: channel
                        });
                    })
                } else {
                    res.json({
                        error: "Channel not found."
                    });
                }
            })  
            .catch((err) => {
                res.status(500);
            });
        }
    });
})

app.listen(port, () => console.log(`Listening on ${port}`))