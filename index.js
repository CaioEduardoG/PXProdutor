const express = require('express');
const bodyParse = require('body-parser');
const cors = require('cors');
const aws = require('aws-sdk');

if(`${process.env.NODE_ENV}` === "dev"){
    require('dotenv').config();
}

if(!aws.config.region){
    aws.config.update({
        region: 'us-east-2'
    })
}

const sqs = new aws.SQS();
const app = express();
const dadosUser = new aws.DynamoDB.DocumentClient();

app.use(bodyParse.json());
app.use(cors());

let pegarURL_fila = async () => {
    return await new Promise((resolve, reject) => {

        var dadosFila = {
            QueueName: `${process.env.NOME_FILA}`
        }

        sqs.getQueueUrl(dadosFila, (err, data) => {
            if (err){
              reject({
                err: err,
                errStack: err.stack
              })
            }
            else{
             resolve({
                url: data.QueueUrl
             })
            } 
        });
    });
};

app.post("/api/colaboradores", (req, res) => {
    
    var nomesClientes = [];
    req.body.clientes.forEach(element => {
        nomesClientes.push(element.nome);
    });
    
    var colaborador = {
        nome: req.body.nome,
        email: req.body.email,
        tribo: req.body.tribo,
        clientes: nomesClientes.join(' - ')
    }

    enviarMensagem(colaborador);

    return res.status(200).json({
        message: 'Tudo okay com metodo POST!'
    });
});


let enviarMensagem = colaborador => {    
    pegarURL_fila().then(resolve => {
        var params = {
            MessageBody: 'Colaboradores',
            QueueUrl: resolve.url,
            MessageAttributes: {
                'Nome': {
                    DataType: 'String',
                    StringValue: colaborador.nome
                },
                'Email': {
                    DataType: 'String',
                    StringValue: colaborador.email
                },
                'Tribo': {
                    DataType: 'String',
                    StringValue: colaborador.tribo
                },
                'Clientes': {
                    DataType: 'String',
                    StringValue: colaborador.clientes
                }
            }
        };
        sqs.sendMessage(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else console.log(data);
        });
    }).catch(reject => {
        console.log(reject.err);
        console.log(reject.errStack)
    });
}

app.get("/api/colaboradores", (req, res) => {
    var params = {
        TableName: `${process.env.NOMETABELA}`
    }    

    dadosUser.scan(params, (err, colaboradores) =>{
        if(err){
            return res.status(400).json({
                err: err
            });
        }else{
            return res.status(200).json(colaboradores);
        }
    });

});

app.get("/healthcheck", (req,res) => {
    return res.status(200).json("Healthcheck okay!");
});

const port = `${process.env.PORT}`;
app.listen(port);
console.log("Servidor rodando local na porta ", port);