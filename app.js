//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt= require("mongoose-encryption")

const app = express();

app.set("view engine", "ejs");

//this must be specified to handle application/json objects 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

async function run() {
    await mongoose.connect("mongodb://localhost:27017/"+process.env.DB_NAME);
    console.log("successfully connected to mongoDB");
}

run().catch(console.dir);

const userSchema = new mongoose.Schema({
    Email: String,
    Password: String
})


userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: [process.env.ENCRYPT] })

const User=mongoose.model("User",userSchema)

let pass = [];

app.get("/", (req, res) => {
    res.render("home")
})

app.get("/register", (req, res) => {
    res.render("register")
})


app.get("/login", (req, res) => {
    res.render("login")
})

//In my quest to render a secrets page when the client's infos are correct, i formulated this url logic. This way, i can make ajax perform an operation just like res.redirect.
app.get("/secrets/user/:name", async (req, res) => {
    const userName = req.params.name;
    const userPass = pass[pass.length - 1]

    if (!userPass) {
        res.redirect("/login")
    }
    else {
           
        res.render("secrets")
        

        //Improvised a "sessioning" logic.
        setTimeout(async () => {
            await pass.splice(0, 1)
            
        }, 300000);
            
    }
})

app.post("/register",async (req, res) => {
    const userName = req.body.username;
    const userPass = req.body.password;

   let result=await User.create({
       Email: userName,
       Password: userPass
   })

    //let returned = await User.findOne({ Password: userPass })
    //console.log(returned);

    res.render("secrets")
})

app.post("/login", async (req, res) => {

    //the value of the data key passed from AJAX is extracted using the syntax below
    const userName = req.body.user;
    const userPass = req.body.pass;
    

    //checking input value against database value in order to grant access.
    //const result =await User.findOne({
    //    $and: [{
    //        Email: userName
    //    },
    //        {
    //            Password: userPass
    //    }]
    //})

    const result = await User.findOne({
        Email: userName
    })
    if (result) {
        //Now, when the values are correct, the values are sent back to AJAX in order to make use of these values for further modifications.
        if (result.Password === userPass) {
            res.send({ userResponse: userName, passwordResponse: userPass });

            pass.push(userPass);
        }
        //when the input values(password) are correct, the string "wrong" is sent back to AJAX to represent the incorrectness of the client's input
        else {
            res.send("wrong")
        }
    }
    //when the input values(password) are correct, the string "wrong" is sent back to AJAX to represent the incorrectness of the client's input
    else {
        res.send("wrong")
    }



      

    ////when the input values are correct, the string "wrong" is sent back to AJAX to represent the incorrectness of the client's input
    //if (!result) {
    //    res.send("wrong")
    //}
    ////Now, when the values are correct, the values are sent back to AJAX in order to make use of these values for further modifications.
    //else {
    //    res.send({ userResponse: userName, passwordResponse: userPass });

    //    pass.push(userPass);
    //}

    
})










app.listen(3000, () => console.log("successsfully connected to server on port 3000"))