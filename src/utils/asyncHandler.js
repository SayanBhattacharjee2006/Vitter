const asyncHandler = (requestHandler) =>{ 
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}
export {asyncHandler}

// explanations:
// 1. The asyncHandler function takes a request handler function as an argument.
// 2. The function returns a new function that wraps the original request handler function. 
// 3. The new function uses Promise.resolve to convert the request handler function to a Promise.
// 4. The new function uses the Promise.resolve to ensure that the request handler function is always called with a Promise.
// 5. If the request handler function throws an error, the error is caught and passed to the next middleware function.
// 6. If the request handler function does not throw an error, the original request handler function is called with the request, response, and next middleware function.
// 7. The new function is then exported for use in the application.










// const asyncHandler =(fn) => async (req,res,next) =>{

//     try{
//         await fn(req,res,next)
//     }catch(error){
//         res.status(error.code || 500).json({
//             success:false,
//             message: error.message || 'Internal Server Error'
//         })
//     }
// }