const mongoose = require('mongoose');

const databaseName = 'task-manager-api'
//подсоеденяю мангуста к базе данных
mongoose.connect(process.env.MONGODB_URL, { 
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
 })
//создаю модель(по сути эта функция возвращает класс с валидацией по нужным мне полям)
 




