const API_URL = import.meta.env.VITE_API_URL;


export const fetchAPI = async (endpoint, options = {} )=>{
    const res = await fetch(`${API_URL}${endpoint}`,{
        headers:{
            "content-type" : "application/json",
            ...(options.headers || {})
        },
        credentials: "include",
        ...options 
    });

    if(!res.ok){
        const error = await res.json().catch(()=>({}));
        throw new Error(error.message || "Something went wrong");
    }

    return res.json();
}