const exrpess = require('express');
//моя mangoose моделю пользователя
const User = require('../models/user')
//мое middleware проверки токена авторизации
const auth = require('../middleware/auth')
//middleware для загрузки файлов
const multer = require('multer')
//для масштабирования картинок
const sharp = require('sharp')
//моя функция рассылки электронной почты через sendgrid
const { sendWelcomeEmail, sendGoodbyeEmail } = require('../emails/account')
const router = new exrpess.Router();


//роутер - штука, которая позволяет вместо app.get() использовать router.get(), т.е. инкапсулировать рауты в отдельный объект, а потом подключать их в app

router.post('/users', async (req, res)=>{
    //создаю юзера по моей модели, созданной с помощью mongoose отправляя туда полученный отпарсеный json из запроса
    const user = new User(req.body);
    //т.е. получается, что кто-то посылает запрос на 
    //мой сервер, сервер через mongoose обращается
    //к базе данных, база данных высылает документ
    //и сервер возвращает его тому, кто послал запрос
    try{
        await user.save();
        const token = await user.generateAuthToken()

        sendWelcomeEmail(user.email, user.name)//функция ассинхронная, но смысла ждать ее нет

        res.status(201)//http status - created
        res.send({user, token})
    }catch(e){
        res.status(400)//ставлю статус ответа "Bad request"
        res.send(e);
        return;
    }

})

router.post('/users/login', async(req, res)=>{
    try{
        //ищу с помощью своей функции поиска юзера по логину и хэшу пароля
        const user = await User.findByCredentials(req.body.email, req.body.password)
        //теперь использую метод генерации токена автоизации у юзера, которого я нашел 
        const token = await user.generateAuthToken();
        //у юзера будет вызыватся перегруженная функция toJSON, в которой я поудалял из юзера всякие ненужные поля типа авы, хэша пароля и т.п.
        res.send({user, token})
    }catch(e){
        res.status(400).send()
    }
})

router.post('/users/logout', auth, async (req, res)=>{
    //вызывается auth >> из токена в хэдере запроса берутся юзер и токен и пихаются в поля запроса
    //теперь к ним есть доступ тута *,*
    try{
        //удаляю текущий токен из массива токенов юзера
        req.user.tokens = req.user.tokens.filter((token)=>token.token !== req.token)
        await req.user.save()
        res.send()
    }catch(e){
        res.status(500).send()
    }
})

router.post('/users/logoutAll', auth, async (req, res)=>{
    try{
        req.user.tokens = []
        await req.user.save()
        res.send()
    }catch(e){
        res.status(500).send()
    }
})

router.get('/users/me', auth, async (req, res)=>{
    //в middleware в реквест был запихан пользователь из токена авторизации
    res.send(req.user)
})

//получение юзера по id(уже не надо)
// router.get('/users/:id', async (req, res)=>{
//     const _id = req.params.id;
//     console.log(_id);

//     try{
//         const user = await User.findById(_id);

//         if(!user){
//             res.status(404).send()
//             return
//         }

//         res.send(user);
//     }catch(e){
//         res.status(500).send(":c")
//     }
// })
//обновление содержимого
router.patch('/users/me', auth, async(req, res)=>{

    //проверка на ключ из запроса. типа вайтлист ключей
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age']
    
    //мой вариант
    if(false){
    updates.forEach((element)=>{
        if(!allowedUpdates.includes(element)){
            res.status(400).send();
            return;
        }
    })
    }
    //c урока
    if(!updates.every((update)=>allowedUpdates.includes(update))){
        res.status(400).send({error:'Invalid updates!'});
        return;
    }
    try{
        //копирую новые свойства по ключам из массива ключей правок, значения из самого запроса
        updates.forEach((update)=>{
            req.user[update] = req.body[update]
        })

        await req.user.save()
        //в update функции нет save, т.е. middleware не работает, как и валидация, значит надо делать нового и сейвить его заново
        //const user = await User.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
        //if(!user) return res.status(404).send(':c');
        
        res.send(req.user)
        
    }catch(e){
        res.status(400).send(e);
    }
})

//удаление
router.delete('/users/me', auth, async(req, res)=>{
    try{
        // const user = await User.findByIdAndDelete(req.user._id)
      
        // if(!user) return res.status(404).send()
        
        //мое middleware пихает юзера в свойства запроса, так что искать его уже нет необходимости
        await req.user.remove();
        sendGoodbyeEmail(req.user.email, req.user.name)
        res.send(req.user)
    }catch(e){
        res.status(500).send(e)
    }
})

//загрузка авы

//настраиваю multer
const avatar = multer({
    //путь к папке, куда складывать файлы, убираю, т.к. теперь я сохраняю в базу данных
    //dest: 'avatars',
    //ставлю максимальный размер файла в 1Мб
    limits:{
        fileSize: Math.pow(2, 20)
    },
    //функция валидации файла (в файле лежит инфа о, неожиданно, саммом файле, коллбэк вызывать когда закончил проверку)
    fileFilter(req, file, callback){
        //с помощью регулярных выражений, проверяю является ли файл пикчей по его названию(в приципе, можно залить и не пикчу, просто сменив тип в названии)
        if(!file.originalname.match(/\.(png|jpg|jpeg)$/)){
            callback(new Error("File must be an image"))
            return
        }
        //в случае успеха в первый аргумент слать undefined, во второй true
        callback(undefined, true);
    }
})

//загрузка аватарки юзера
//тут сразу два middleware для проверки аунтификации и малтеровский для загрузки пикчи
router.post('/users/me/avatar', auth, avatar.single('avatar'), async(req, res)=>{
    //пихаю пикчу в документ узера
    //req.user.avatar = req.file.buffer 
    //меняю размер исходной пикчи и перевожу ее в пнг, возвращаю ее из sharpовской срани обратно в буфер и пихаю в аватарку юзера
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer

    await req.user.save()
    res.send()
    //следующий аргумент - обработчик исключений(и error'ов), вызванных в middleware
}, (error, req, res, next)=>{
    res.status(400).send({error: error.message})
})

//удаление аватара
router.delete('/users/me/avatar', auth, async(req, res)=>{
    req.user.avatar = undefined;
    await req.user.save()
    res.send()
})

//получение аватара
router.get('/users/:id/avatar', async (req, res)=>{
    try{
        const user = await User.findById(req.params.id)

        if(!user || !user.avatar){
            throw new Error()
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    }catch(e){
        res.status(404).send()
    }
})
module.exports = router
