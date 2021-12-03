// Contruindo o servidor usando o modulo do express
// Este modulo possue funções para executar e manipular um servidor node
// Criando uma referencia do express com a importancia do modulo
const express = require("express");

// Importar modulo que fará a interface entre
// nodeJs e o banco de dados mongodb
const mongoose = require("mongoose");

// importação de modulo bcrypt para criptgrafias de senha
const bcrypt = require("bcrypt");

// JSONWebToken é um hash que garante a seção segurança em uma página ou grupos de páginas
// permitindo ou Não acesso aos conteudos desta página. Ele é gerado a partir de alguns
// Elementos, tais como: dados que importam ao token(payload), chave secreta, tempo de
// expiração e método de criptografia
const jwt = require("jsonwebtoken");

const cfn = require("./config");
const { jwt_expires } = require("./config");

const url =
  "mongodb+srv://kleber:Mineonderhf12@clustercliente.bm5f6.mongodb.net/apisolo?retryWrites=true&w=majority";

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Criando uma estrutura de tabela de docentes com o comando schema
const table = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  cpf: { type: String, required: true, unique: true },
  user: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Aplicação da criptografia do bcryptda tabela de cadastro
// dos professores será feita um passo antes do salvamento
// dos dados docentes
// irei usar o comando pre
table.pre("save", function (next) {
  let docente = this;
  if (!docente.isModified("password")) return next();
  bcrypt.hash(docente.password, 10, (erro, rs) => {
    if (erro) return console.log(`Erro ao gerar senha${erro}`);
    docente.password = rs;
    return next();
  });
});

// Execução de tabela
const Docente = mongoose.model("tbdocente", table);

// criar uma referencia do servidor express para utiliza-lo
const app = express();

// fazer o servidor express receber e tratar dados em formato json
app.use(express.json());

/*
Abaixo iremos criar as 4 rotas para os verbos GET, POST, PUT, DELETE:
    - GET -> Esse verbo é utilizado todas as vezes que o usuário requisita
    alguma informação ao servidor e, este por sua vez responde;

    - POST -> É utilizado todas vezes que o usuário quiser cadastrar um cliente 
    ou enviar um dado importante ao servidor;

    - PUT -> É usado quando se deseja atualizar algum dado sobre um objeto;

    - DELETE -> É usado para apagar um dado sobre um objeto;

    Ao final das rotas iremos aplicar ao servidor uma porta de comunicação. No nosso 
    será a porta 3000.
*/

app.get("/api/docente/", verifica, (req, res) => {
  Docente.find((erro, dados) => {
    if (erro) {
      return res
        .status(400)
        .send({ output: `Erro ao tentar ler os docentes ->${erro}` });
    }
    res.status(200).send({ output: dados });
  });
});

// para selecionar um docente especifico
app.get("/api/docente/:id", (req, res) => {
  Docente.findById(req.params.id, (erro, dados) => {
    if (erro) {
      return res
        .status(400)
        .send({ output: `Erro ao tentar encontrar docente ->${erro}` });
    }
    res.status(200).send({ output: dados });
  });
});

// para cadastrar um docente
app.post("/api/docente/cadastro", (req, res) => {
  const docente = new Docente(req.body);
  docente
    .save()
    .then(() => {
      const gerated = createToken(req.body.user, req.body.name);
      res.status(201).send({ output: `Docente cadastrado`, token: gerated });
    })
    .catch((erro) =>
      res.status(400).send({ output: `Erro ao tentar cadastrar ->${erro}` })
    );
});

// Validando login
app.post("/api/docente/login"),
  (req, res) => {
    const us = req.body.user;
    const pw = req.body.password;
    Docente.findOne({ user: us }, (erro, dados) => {
      if (erro) {
        return (
          res.status(400),
          send({ output: `Erro ao procurar Docente -> ${erro}` })
        );
      }
      bcrypt.compare(pw, dados.password, (erro, igual) => {
        if (erro)
          return res
            .status(400)
            .send({ output: `Erro ao tentar logar -> ${erro}` });
        if (!igual) return res .status(400).send({ output: `Senha incorreta!` });
        const gerated = createToken(dados.user, dados.name);
        res.status(200).send({
          output: `Logado`,
          payload:dados,
          token:gerated,
        });
      });
    });
  };

app.put("/api/docente/atualizar/:id", verifica, (req, res) => {
  Docente.findByIdAndUpdate(req.params.id, req.body, (erro, dados) => {
    if (erro) {
      return res
        .status(400)
        .send({ output: `Erro ao tentar atualizar ->${erro}` });
    }
    // O output é apenas uma variavel, poderia ser qualquer outro nome
    res.status(200).send({ output: `Dados atualizados` });
  });
});

app.delete("/api/docente/delete/:id", verifica, (req, res) => {
  Docente.findByIdAndDelete(req.params.id, (erro, dados) => {
    if (erro) {
      return res
        .status(400)
        .send({ output: `Erro ao tentar deletar -> ${erro}` });
    }
    res.status(204).send({});
  });
});

// gerar token
const createToken = (user, name) => {
  return jwt.sign({ user:user, name:name }, cfn.jwt_key, {
    expiresIn:cfn.jwt_expires
  });
};

// validação do token
function verifica(req, res, next) {
  const token_gerado = req.headers.token;
  if (!token_gerado) {
    return res.status(401).send({ output: `Não há token` });
  }
  jwt.verify(token_gerado, cfn.jwt_key, (erro, dados) => {
    if (erro) return res.status(401).send({ output: `Token inválido` });
    next();
  });
}

app.listen(3000, () => console.log("Servidor online em http://localhost:3000"));
