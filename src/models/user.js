//для ассоциации объектов с их документами в базе данных
const mongoose = require('mongoose');
//просто 100500 удобных функций для валидации данных
const validator = require('validator');
//для хэширования паролей
const bcrypt = require('bcryptjs');
//для токенов авторизации
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    name:  {
       type: String,
       required: true,
       trim: true
   },
    age:{
       type: Number,
       defaloult: 0,
       validate(value){
           if(value < 0){
               throw new Error("Negative values are not allowed.")
           }
       }
   },
   email:{
       type: String,
       //больше объектов с таким же значением этого свойства создать будет нельзя
       unique: true,
       required: true,
       trim: true,
       lowercase: true,
       validate: (value)=>{
           if(!validator.isEmail(value))
               throw new Error("value mast be an email.")
       }
   },
   password:{
       type: String,
       required: true,
       validate(value){
           if(value.length < 7 || value.toLowerCase().indexOf('password') != -1){
               throw new Error('Password must be longer than 6 symbols and not contain words such as "password".');
           }
       },
   },
   //токины авторизации(устройств, с которых зашел пользователь может быть много)
   tokens: [{
       token:{
           type: String,
           required: true
       }
   }],
   avatar:{
       type: Buffer
   }
},{
    timestamps: true
});
//нестатический метод
userSchema.methods.generateAuthToken = async function (){
    //генерирую jw токен из id пользователя в базе данных и секрета, секрет дальше могу использовать для верификации токена
    const token = jwt.sign({_id: this._id.toString()}, process.env.JWT_SECRET)

    //сохраняю токен авторизации в массив токенов в пользователе
    this.tokens = this.tokens.concat({token})
    await this.save();

    return token
}

//виртуальные свойства не хранятся в модели напрямую, но с помощью них мангус разбирается, как связаны модели, в данном случае Task и User
userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.toJSON = function(){
    const userDataWithoutMongooseStaff = this.toObject()

    //прячу пароль с токенами
    delete userDataWithoutMongooseStaff.password;
    delete userDataWithoutMongooseStaff.tokens;
    delete userDataWithoutMongooseStaff.avatar;

    return userDataWithoutMongooseStaff
}

//добавляю статический метод поиска пользователя по  логину и паролю
userSchema.statics.findByCredentials = async (email, password)=>{
    const user = await User.findOne({ email })

    if(!user) throw new Error('Unable to login!')

    //нельзя говорить, что именно не подходит, логин или пароль, ибо хацкеру эта инфа может быть полезной
    if(!await bcrypt.compare(password, user.password)) throw new Error('Unable to login!')

    return user
}

//делаю middleware для конвертации пароля в хэш
//(т.е. эта штука будет запускаться до метода модели в первом аргументе, т.е. перед сохранением)
userSchema.pre('save', async function(next){
    //arrow функции не имеют this, а он тут нужен
    const user = this

    //будет true если оно либо создается в первый раз, либо меняет значение
    if(user.isModified('password')){
        //хэширую пароль
        user.password = await bcrypt.hash(user.password, 8)
    }

    //вся эта херь асинхронная, так что нужно вызывать следующую функцию(хз какая она, она просто есть)
    next()
})

//если я буду удалять юзера, то сначала удалю его таски
userSchema.pre('remove', async function(next){
    //провожу магический ритуал для получения всех тасков, в ref которых лежит id этого юзера
    await this.populate('tasks').execPopulate()
    //удаляю эти таски
    this.tasks.forEach((task)=>{
        task.remove()
    })
})

//создаю модель(по сути эта функция возвращает класс с валидацией по нужным мне полям),
//который привязан к документу из базы данных
const User = mongoose.model('User', userSchema)

module.exports = User;