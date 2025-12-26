import express from "express";
import cors from "cors";
import routes from "./routes.js";
import "./cleanup.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
}));

app.use(express.json());
app.use("/api", routes);

app.listen(4000, () => console.log("Backend running on 4000"));
