import("./passport/local.js");
import * as dotenv from "dotenv";
dotenv.config();
import moment from "moment";
import MensajesDao from "./daos/MensajesDao.js";
import Productos from "./daos/ProductosDao.js";
import { normalize } from "normalizr";
import chatSchema from "./normalizr/mensajes.js";
import cluster from "cluster";
import os from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import yargs from "yargs";
const args = yargs(process.argv.slice(2))
  .default({
    PORT: 8080,
    MODO: "FORK",
  })
  .alias({
    p: "PORT",
    m: "MODO",
  }).argv;

import MongoStore from "connect-mongo";
const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true };

import express from "express";
import http from "http";
import { Server } from "socket.io";
const app = express();
const server = http.createServer(app);
const io = new Server(server);

import session from "express-session";
import passport from "passport";

import productos from "./routes/productos.js";
import randoms from "./routes/randoms.js";
import info from "./routes/info.js";
import login from "./routes/login.js";
import registro from "./routes/registro.js";
import index from "./routes/index.js";
import logout from "./routes/logout.js";

const MODO_CLUSTER = args.MODO === "CLUSTER";

if (MODO_CLUSTER && cluster.isPrimary) {
  const cpus = os.cpus().length;
  console.log(`Master`);
  for (let i = 0; i < cpus; i++) {
    cluster.fork();
  }
} else {
  app.set("views", "./src/views");
  app.set("view engine", "ejs");

  app.use(express.static(__dirname + "/public"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      store: MongoStore.create({
        mongoUrl: `mongodb://anyone:${process.env.MONGOPASS}
        @ecommerce-shard-00-00.obuuu.mongodb.net:27017,
        ecommerce-shard-00-01.obuuu.mongodb.net:27017,
        ecommerce-shard-00-02.obuuu.mongodb.net:27017/?ssl=true&replicaSet=atlas-xzhi9f-shard-0&authSource=admin&retryWrites=true&w=majority`,
        mongoOptions: advancedOptions,
      }),
      secret: process.env.SECRETKEY,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 600000,
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use("/api", productos);
  app.use("/api", randoms);
  app.use("/login", login);
  app.use("/logout", logout);
  app.use("/registro", registro);
  app.use("/info", info);
  app.use("/", index);
  io.on("connection", async (socket) => {
    socket.emit("productos", await Productos.mostrarTodos());
    socket.on("dataMsn", async (x) => {
      const { title, price, thumbnail } = x;
      let objNew = {
        title: title,
        price: price,
        thumbnail: thumbnail,
      };
      await Productos.guardar(objNew);
      io.sockets.emit("productos", await Productos.mostrarTodos());
    });
    const chat = {
      id: `${Math.floor(Math.random() * 1000)}`,
      nombre: "Centro de Mensajes",
      mensajes: await MensajesDao.mostrarTodos(),
    };
    const mensajesNormalized = normalize(chat, chatSchema);
    function print(objeto) {
      console.log(inspect(objeto, false, 12, true));
    }
    // print(mensajesNormalized)
    socket.emit("mensajes", chat); // Reemplazar chat por mensajesNormalized para usar normalizacion y ver el frontend
    socket.on("Msn", async (x) => {
      const { autor, texto } = x;
      let newMen = {
        id: `${Math.floor(Math.random() * 1000)}`,
        autor: autor,
        texto: texto,
        timestamp: moment().format("DD/MM/YYYY hh:mm:ss"),
      };
      await MensajesDao.guardar(newMen);
      const chat = {
        id: `${Math.floor(Math.random() * 1000)}`,
        nombre: "Centro de Mensajes",
        mensajes: await MensajesDao.mostrarTodos(),
      };
      const mensajesNormalized = normalize(chat, chatSchema);
      io.sockets.emit("mensajes", chat);
    });
  });

  server.listen(args.PORT, () => {
    console.log(
      `Servidor http escuchando en el puerto ${args.PORT}, process ID: ${process.pid}`
    );
  });
}
