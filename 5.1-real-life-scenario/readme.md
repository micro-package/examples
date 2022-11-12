## **Usage of framework in real life scenario**



### **Domain**

Root points are equivalent of `describe` test names

1. User needs to know what is the *age* for specific *name*
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
4. User needs to know how many times asked for *age* for specific *name*
     1. I as a User send request with *name*
     2. Application gets amount of stored data for specific *name*
     3. Application responds on user request with *amount of requests*

### **Technology**

1. `postgres`
2. `agify.io`
3. `express`
4. `axios`
5. `@micro-package/storyteller` as integration tests testing framework

### **Endpoints**

1. `/name-to-age/{name}` - returns *age*
2. `/average-age` - returns *average age*
3. `/average-age/{name}` - returns *average age* for *name*
4. `/requests-for-age/{name}` - returns *amount of requests* for *name*


### **About testing**

According to The Testing Trophy 
https://twitter.com/kentcdodds/status/960723172591992832

As you can see in the picture in tweet there are 4 parts of tests.
Framework is used here for implementation of easy to maintain integration tests for API.

1. End to End - Test application together with external services
2. **Integration** - Test isolated application integration with external services
3. Unit - Test a function isolated from anything expect a function itself
4. Static - Test your code for broken rules applied by types

There is actually a lot of codebase work integration tests implemented here.
It's because application is treated here like a blackbox and there is need to create mocks for every external service expect those emulated locally.
Even though codebase looks relatively big comparing to application itself it's repetitive structure makes it easy to maintain especially in the large test sets.

Micro package is flexible enough to let anyone implement virtually anything as a plugin, it also allows to extend plugins with new ones. 
