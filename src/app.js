import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app=express();

// middlewares
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({
    limit: '50mb'
}))
app.use(express.urlencoded({
    extended: true,
    limit: '50mb'
}))
app.use(express.static('public'))
app.use(cookieParser());


//routes import
import userRouter  from "./routes/user.route.js";
import commentRouter from "./routes/comment.route.js";
import dashboardRouter from "./routes/dashboard.route.js";

app.use('/api/v1/users', userRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export {app};