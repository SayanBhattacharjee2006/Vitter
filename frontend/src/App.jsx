import './App.css'
import { 
  createBrowserRouter,
  RouterProvider, 
  createRoutesFromElements, 
  Route } 
  from "react-router-dom"
import HomeLayout from "./layouts/HomeLayout"



const router = createBrowserRouter(createRoutesFromElements(
  <Route path='/' element={<HomeLayout/>}>

  </Route>
))
function App() {
  return (
   <>
   <RouterProvider router={router}/>
   </>
  )
}

export default App
