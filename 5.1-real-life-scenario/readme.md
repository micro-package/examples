## **Usage of framework in real life scenario**

### **Domain**

1. User need to know what is the *age* for specific *name*
     1. I as a User send request with *name*
     2. Application fetches *age* from *agify*
     3. Application stores *age* with a *name*
     4. Application responds on user request with *age*
2. User needs to know what is the *average age* for all people   
     1. I as a User send request
     2. Application responds on user request with *average age*
     3. Application gets *average age*
3. User needs to know what is the *average age* for specific name
     1. I as a User send request with *name*
     2. Application gets *average age* for people with correct *name*
     3. Application responds on user request with *average age*
4. User need to know how many times asked for *age* for specific *name*
     1. I as a User send request with *name*
     2. Application gets amount of stored data for specific *name*
     3. Application responds on user request with *amount of requests*

### **Technology**

1. `postgres`
2. `agify.io`
3. `express`
4. `axios`

### **Endpoints**

1. `/name-to-age/{name}` - returns *age*
2. `/average-age` - returns *average age*
3. `/average-age/{name}` - returns *average age* for *name*
4. `/requests-for-age/{name}` - returns *amount of requests* for *name*

