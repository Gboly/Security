//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption")
//var sha512 = require('js-sha512');
//const md5 = require("md5")
//const bcrypt = require("bcryptjs");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const flash = require("connect-flash");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.set("view engine", "ejs");


//this must be specified to handle application/json objects 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(flash());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {}
}))
app.use(passport.initialize());
app.use(passport.session());

async function run() {
    await mongoose.connect("mongodb://localhost:27017/"+process.env.DB_NAME);
    console.log("successfully connected to mongoDB");
}

run().catch(console.dir);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    facebookId: String
})

//const Options = {
//    usernameField: "Email",
//};

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: [process.env.ENCRYPT] })

const User=mongoose.model("User",userSchema)

passport.use(User.createStrategy());
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback: true,
},
    function (request, accessToken, refreshToken, profile, done) {          
        
        User.findOrCreate({ googleId: profile.id, username: profile.emails[0].value }, function (err, user) {
            return done(err, user);
        });
    }
));
passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_FB_ID,
    clientSecret: process.env.CLIENT_FB_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ['id', 'displayName', 'photos', 'email'],
    passReqToCallback: true,
},
    function (request, accessToken, refreshToken, profile, done) {


        User.findOrCreate({ facebookId: profile.id, username: profile.emails[0].value }, function (err, user) {
            return done(err, user);
        });
    }
));

passport.serializeUser((user, done) => {
    return done(null, user.id);
});
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        return done(err, user);
    })
});

//let pass = [];

app.get("/", (req, res) => {
    res.render("home")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }))
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ["email"], authType:"reauthenticate" }));

app.get("/secrets", async (req, res) => {
    //const userName = req.params.name;
    //const userPass = pass[pass.length - 1]

    //if (!userPass) {
    //    res.redirect("/login")
    //}
    //else {           
    //    res.render("secrets")        

    //    //Improvised a "sessioning" logic.
    //    setTimeout(async () => {
    //        await pass.splice(0, 1)            
    //    }, 300000);            
    //}
    res.set(
        'Cache-Control',
        'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
    );
    const Person = req.user;
    
    if (req.isAuthenticated()) {
        const Name = Person.username;
        const Google = req.user.googleId
        const Facebook = req.user.facebookId;
        if (!Google) {
            if (!Facebook) {
                return res.render("secrets", { Name: Name + " signed in to secrets locally" })
            }
            else {
                return res.render("secrets", { Name: Name + " signed in to secrets through facebook" })
            }           
        }
        else { res.render("secrets", { Name: Name + " signed in to secrets through google" })}
        
    }
    else {        
        res.redirect("/login");
    }
})

app.get("/auth/google/secrets", passport.authenticate("google", { failureRedirect: "/login" }), (req, res) => {    
       res.redirect("/secrets");
})

app.get("/auth/facebook/secrets", passport.authenticate("facebook", { failureRedirect: "/login" }), (req, res) => {
    res.redirect("/secrets");
})

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
})

app.post("/register", (req, res) => {
    //const userName = req.body.username;
   // const userPass = sha512(req.body.password);

    //const hash = await bcrypt.hash(req.body.password, 10);

   //await User.create({
   //    Email: userName,
   //    Password: hash
   //})
   
    //let returned = await User.findOne({ Password: userPass })
    //console.log(returned);

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, function () {                
                res.redirect("/secrets")
            })
        }
    })


    //res.render("secrets")
})

////Normal middleware syntax as stated in the docs
//    passport.authenticate("local", {
//        failureRedirect: "/login",
//        successRedirect: "/secrets",
//        successFlash: { type: 'success_msg', message: 'Welcome !' },
//        failureFlash: { type: 'error_msg', message: 'Your email and/or password are wrong, try again !' }
//    })



app.post("/login", async (req, res, next) => {
   
    //********* USING BCRYPT

    ////the value of the data key passed from AJAX is extracted using the syntax below
    //const userName = req.body.user;
    //const userPass = req.body.pass;    

    //////checking input value against database value in order to grant access.
    ////const result =await User.findOne({
    ////    $and: [{
    ////        Email: userName
    ////    },
    ////        {
    ////            Password: userPass
    ////    }]
    ////})

    //const result = await User.findOne({
    //    Email: userName
    //})
    //if (result) {
    //    //Now, when the values are correct, the values are sent back to AJAX in order to make use of these values for further modifications.
    //    //if (result.Password === userPass) {
    //    const correct = await bcrypt.compare(req.body.pass, result.Password)

    //    if (correct) {            
    //        res.send({ userResponse: userName, passwordResponse:});
    //        pass.push("value");
    //    }
    //    //when the input values(password) are correct, the string "wrong" is sent back to AJAX to represent the incorrectness of the client's input
    //    else {           
    //        res.send("wrong")
    //    }i
    //}
    ////when the input values(password) are correct, the string "wrong" is sent back to AJAX to represent the incorrectness of the client's input
    //else {
    //    res.send("wrong")
    //}      



    //*******USING PASSPORT

    passport.authenticate("local", 
        (err, user, info) => {


            if (err) {
                return next(err);
            };
            if (!user) {
                //return res.redirect("/login" + "?info=Email or Password is incorrect. Try again");
                return res.send("wrong")
            }
                        
            req.login(user, function (err) {
                //return res.redirect("/secrets");
                return res.send("correct");
            });
                
                //res.send("correct");                       
        }
    )(req, res, next);
    
    
})



app.listen(3000, () => console.log("successsfully connected to server on port 3000"))