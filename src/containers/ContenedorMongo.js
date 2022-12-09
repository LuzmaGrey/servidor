import mongoose from "mongoose";
import { asPOJO, renameField, removeField } from "../utils/objectUtils.js";
import * as dotenv from "dotenv";
dotenv.config();

mongoose.connect(
  `mongodb://anyone:${process.env.MONGOPASS}
  @ecommerce-shard-00-00.obuuu.mongodb.net:27017,ecommerce-shard-00-01.obuuu.mongodb.net:27017,ecommerce-shard-00-02.obuuu.mongodb.net:27017/?ssl=true&replicaSet=atlas-xzhi9f-shard-0&authSource=admin&retryWrites=true&w=majority`
);

mongoose.connection.on("open", () => {
  console.log("Database ok!");
});

mongoose.connection.on("error", () => {
  console.log("Database error");
});

class ContenedorMongoDb {
  constructor(nombreColeccion, esquema) {
    this.coleccion = mongoose.model(nombreColeccion, esquema);
  }
  async mostrar(obj) {
    try {
      const documento = await this.coleccion.find(obj);
      if (documento.length == 0) {
        throw new Error("Error al listar por id: no encontrado");
      } else {
        const result = renameField(asPOJO(documento[0]), "_id", "id");
        return result;
      }
    } catch (error) {
      // throw new Error(`Error al listar por id: ${error}`);
      return null;
    }
  }

  async mostrarTodos() {
    try {
      let documentos = await this.coleccion.find();
      documentos = documentos.map(asPOJO);
      documentos = documentos.map((d) => renameField(d, "_id", "id"));
      return documentos;
    } catch (error) {
      throw new Error(`Error al listar todo: ${error}`);
    }
  }

  async guardar(obj) {
    try {
      let doc = await this.coleccion.create(obj);
      doc = asPOJO(doc);
      renameField(doc, "_id", "id");
      return doc;
    } catch (error) {
      throw new Error(`Error al guardar: ${error}`);
    }
  }

  async actualizar(elem) {
    try {
      renameField(elem, "id", "_id");
      const { n, nModified } = await this.coleccion.replaceOne(
        { _id: elem._id },
        elem
      );
      if (n == 0 || nModified == 0) {
        throw new Error("Error al actualizar: no encontrado");
      } else {
        renameField(elem, "_id", "id");
        return asPOJO(elem);
      }
    } catch (error) {
      throw new Error(`Error al actualizar: ${error}`);
    }
  }

  async borrar(id) {
    try {
      const { n, nDeleted } = await this.coleccion.deleteOne({ _id: id });
      if (n == 0 || nDeleted == 0) {
        throw new Error("Error al borrar: no encontrado");
      }
    } catch (error) {
      throw new Error(`Error al borrar: ${error}`);
    }
  }

  async borrarTodo() {
    try {
      await this.coleccion.deleteMany({});
    } catch (error) {
      throw new Error(`Error al borrar: ${error}`);
    }
  }
}

export default ContenedorMongoDb;
