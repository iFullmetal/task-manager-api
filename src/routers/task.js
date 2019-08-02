const express = require('express')
const Task = require('../models/task')
const auth = require('../middleware/auth')

const router = new express.Router();

//POST - создание контента
router.post('/tasks', auth, async (req, res)=>{
    // task = new Task(req.body);
    task = new Task({
        //... - оператор копирования всех свойств объекта. эквивалентен закоменченной строке выше
        ...req.body,
        owner: req.user._id
    })
    try{
        await task.save();

        res.status(201)//статус - created
        res.send(task);
    }catch(e){
        res.status(400);
        res.send(e);
    }

    //вариант с промисами
    // task.save().then((r)=>{
    //     res.status(201)//статус - created
    //     res.send(task);
    // }).catch((e)=>{
    //     res.status(400);
    //     res.send(e);
    // })
})


// /tasks?completed=true
// /tasks?limit=10?skip=1 (limit - количевство тасков в одном ответе, скип - позиция относительно начала коллекции, от нее идет уже limit)
// /tasks/sortBy=createdAt:desc
router.get('/tasks', auth, async (req, res)=>{

    try{
        //const tasks = await Task.find({owner:req.user._id})
        const match = {}
        const sort = {}
        //если в квери строке есть это свойство(несмотря на то, что там false/true, это не булы, а всего лишь строка, так что иф работает как надо)   
        if(req.query.completed){
            if(req.query.completed === 'true') match.completed = true
            else if(req.query.completed === 'false') match.completed = false
        }
        if(req.query.sortBy){
            //делю строку сортировки на части по разделителю : в массив
            const parts = req.query.sortBy.split(':')
            //меняю сортировку
            sort[parts[0]] =  parts[1] === 'desc' ? -1 : 1;
        }
        //использую заклинание виртуального поля tasks, получая все таски, в ref которых лежит этот юзер
        await req.user.populate({
            path:'tasks',
            match,
            options:{
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        res.send(req.user.tasks)
    }catch(e){
        res.status(500).send(e);
    }
    // Task.find({}).then((tasks)=>{
    //     res.send(tasks);
    // }).catch((e)=>{
    //     res.status(500).send(e);
    // })
})

router.get('/tasks/:id', auth, async (req, res)=>{
    
    try{
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })

        if(!task) return res.status(404).send();

        res.send(task)
    }catch(e){
        res.status(500).send(e);
    }
    //promises
    // Task.findOne({_id: req.params.id}).then((task)=>{
    //     if(!task) return res.status(404).send();
    //     res.send(task)
    // }).catch((e)=>{
    //     res.status(500).send(e);
    // })
})

router.patch('/tasks/:id', auth, async(req, res)=>{
    const updates = Object.keys(req.body);
    const allowedUpdates = ['description', 'completed'];
    
    if(!updates.every((update)=>{
        return allowedUpdates.includes(update)
    }))
    {
        res.status(400).send({error:"Bad updates"})
        return;
    }
    try{
        //с этим способом не будет работать midleware сэйва
        //const task = await Task.findByIdAndUpdate(req.params.id, req.body, {new:true, runValidators:true})
        //по этому делаю так
        const task = await Task.findOne({_id:req.params.id, owner: req.user._id})

        if(!task) return res.status(404).send();

        updates.forEach((update)=>{
            task[update] = req.body[update]
        })

        //на этом моменте идет валидация свойства из запроса(тип и т.п.). вот тут вылетит error, если что
        await task.save()
        
        res.send(task);
    }catch(e)
    {
        res.status(400).send(e)
    }

})

router.delete('/tasks/:id', auth, async(req, res)=>{
    try{
        const task = await Task.findOneAndDelete({_id:req.params.id, owner: req.user._id})
      
        if(!task) return res.status(404).send()

        res.send(task)
    }catch(e){
        res.status(500).send(e)
    }
})

module.exports = router