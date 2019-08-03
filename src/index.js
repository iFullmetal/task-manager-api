const express = require('express');
require('./db/mongoose') //код запускается, мангус конекстится к базе данных 
const userRouter = require('./routers/user')
const taskRouter = require('./routers/task')

const app = express();
const port = process.env.PORT;  

//test
// const User = require('./models/user')
// const user = new User({
//     email:"foo@foo.com",
//     name: "mr. foo",
//     password: "1234five"

// })
// user.save()
//!test

//-----
// middleware - код, котрый исполняется между запросом и route handler'ом (request ----> middleware ----> route handler)
// req между middleware и route handler'ом один и тот же, так что из middleware в него можно напихать разных свойств, которые будут доступны и в rout hadler'е
//-----
// app.use((req, res, next)=>{
//     console.log(req.method, req.path)
//     //res.send('middleware')
//     next()
// })
// app.use((req, res, next)=>{
//     res.status(503).send('maintence :c');
// })

app.use(express.json())//по дефолту все парсится в json
app.use(userRouter)
app.use(taskRouter)

app.listen(port, ()=>{
    console.log('Server is up on port', port);
})


