const jwt = require('jsonwebtoken')
const User = require('../models/user')

module.exports = async (req, res, next) => {
    try{
        //получаю токен из хэдера запроса
        const token = req.header('Authorization').replace("Bearer ", '');
        //дешефруем токен, в нем _id юзера 
        const decoded = jwt.verify(token, process.env.JWT_SECRET) //по сути я дешифрую base64 строку в объект с _id пользователя, а непостредственно верификация идет на следующей строчке
        //ищу юзера с этим _id и токеном в массиве токенов(т.к. токен со временем просрочится и я его удалю с массива, но авторизацию при это он бы прошел)
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

        if(!user) throw new Error("no user")
        
        //сохраняю токен и юзера в запросе. т.к. это middleware, то запрос тот же и уже непосредственно в коде раута я имею доступ к этим же полям
        req.token = token;
        req.user = user;
        next()
    }
    catch(e){
        res.status(401).send({error:"Please authenticate.", e})
    }
    
}