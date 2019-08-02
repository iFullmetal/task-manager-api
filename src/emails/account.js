const sgMail = require('@sendgrid/mail')



//говорю сендгриду свой апи ключ
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name)=>{
    sgMail.send({
        from: "max@b.com",
        to: email,
        subject: "Welcome!",
        text: `Welcom to the app, ${name}. Let me now how you get along with the app.`
    })
}

const sendGoodbyeEmail = (email, name)=>{
    sgMail.send({
        to:email,
        from: "max@b.com",
        subject: "Goodbye :c",
        text: `We are very sorry for the reason why are you lefting us. Bye-bye, Mr. ${name} :c`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendGoodbyeEmail
}