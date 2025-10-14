// importing dotenv for environment variables
import dotenv from 'dotenv';
dotenv.config();

import {app} from './app.js';
import connectDB from "./db/index.js";

// Connect to MongoDB
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server running on port ${process.env.PORT}`);
    })
})
.catch((err) => console.error("Failed to connect to MongoDB", err));


























// an method to connect to MongoDB


// import express from 'express'
// const app = express()

// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error",()=>{
//             console.log("Error connecting to MongoDB: ", err)
//             process.exit(1);
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`Server running on port ${process.env.PORT}`)
//         })
//     }
//     catch(err){
//         console.log("Error connecting to MongoDB: ", err)
//         throw err;
//     }
// })()

